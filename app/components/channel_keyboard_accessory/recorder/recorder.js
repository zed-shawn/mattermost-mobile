// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Alert, TouchableOpacity} from 'react-native';
import {Recorder} from '@react-native-community/audio-toolkit';
import Permissions from 'react-native-permissions';
import DeviceInfo from 'react-native-device-info';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {intlShape} from 'react-intl';

import {PermissionTypes} from 'app/constants';
import {generateId} from 'app/utils/file';

export default class Record extends PureComponent {
    static propTypes = {
        createVoiceMessage: PropTypes.func.isRequired,
        rootId: PropTypes.string,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.recorder = null;
    }

    getPermissionDeniedMessage = () => {
        const {formatMessage} = this.context.intl;
        const applicationName = DeviceInfo.getApplicationName();
        return {
            title: formatMessage({
                id: 'mobile.ios.mic_permission_denied_title',
                defaultMessage: '{applicationName} would like to access your Microphone',
            }, {applicationName}),
            text: formatMessage({
                id: 'mobile.ios.mioc_permission_denied_description',
                defaultMessage: 'Upload voice notes to your Mattermost instance. Open Settings to grant Mattermost microphone access to record your voice notes.',
            }),
        };
    };

    requestPermissions = async () => {
        const {formatMessage} = this.context.intl;
        let permissionRequest;
        const hasMicPermissions = await Permissions.check('microphone');

        switch (hasMicPermissions) {
        case PermissionTypes.UNDETERMINED:
            permissionRequest = await Permissions.request('microphone');
            if (permissionRequest !== PermissionTypes.AUTHORIZED) {
                return false;
            }
            break;
        case PermissionTypes.DENIED: {
            const canOpenSettings = await Permissions.canOpenSettings();
            let grantOption = null;
            if (canOpenSettings) {
                grantOption = {
                    text: formatMessage({
                        id: 'mobile.permission_denied_retry',
                        defaultMessage: 'Settings',
                    }),
                    onPress: () => Permissions.openSettings(),
                };
            }

            const {title, text} = this.getPermissionDeniedMessage();

            Alert.alert(
                title,
                text,
                [
                    grantOption,
                    {
                        text: formatMessage({
                            id: 'mobile.permission_denied_dismiss',
                            defaultMessage: 'Don\'t Allow',
                        }),
                    },
                ]
            );
            return false;
        }
        }

        return true;
    };

    startRecord = async () => {
        if (this.recorder) {
            this.recorder.destroy();
        }

        const hasPermission = await this.requestPermissions();
        if (hasPermission) {
            this.recorder = new Recorder(`voice-message-${generateId()}.aac`, {
                bitrate: 128000,
                channels: 2,
                sampleRate: 44100,
                format: 'aac',
                quality: 'high',
            }).record(this.recordingStarted);
        }
    };

    stopRecord = () => {
        if (this.recorder) {
            this.recorder.destroy();
            this.postVoiceMessage();
        }
    };

    recordingStarted = (error) => {
        if (error) {
            this.stopRecord();
        }
    };

    postVoiceMessage = () => {
        const {createVoiceMessage, rootId} = this.props;

        createVoiceMessage(this.recorder.fsPath, rootId);
        this.recorder = null;
    };

    render() {
        return (
            <TouchableOpacity
                onPressIn={this.startRecord}
                onPressOut={this.stopRecord}
            >
                <Icon
                    name='mic-none'
                    size={24}
                    color={'white'}
                />
            </TouchableOpacity>
        );
    }
}