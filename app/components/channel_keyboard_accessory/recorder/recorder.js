// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Alert, TouchableOpacity, Animated} from 'react-native';
import {Recorder} from '@react-native-community/audio-toolkit';
import Permissions from 'react-native-permissions';
import DeviceInfo from 'react-native-device-info';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {intlShape} from 'react-intl';
import RNFetchBlob from 'rn-fetch-blob';

import {PermissionTypes} from 'app/constants';
import {generateId} from 'app/utils/file';
import {changeOpacity} from 'app/utils/theme';

export default class Record extends PureComponent {
    static propTypes = {
        createVoiceMessage: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
        rootId: PropTypes.string,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.recorder = null;

        this.scale = new Animated.Value(-80);
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
            const recorderOptions = {
                bitrate: 128000,
                channels: 2,
                sampleRate: 44100,
                format: 'aac',
                quality: 'high',
            };
            this.recorder = new Recorder(
                `voice-message-${generateId()}.aac`,
                recorderOptions,
                this.onNewPower,
            ).record(this.recordingStarted);
        }
    };

    stopRecord = () => {
        if (this.recorder) {
            this.recorder.destroy();
            this.postVoiceMessage();
            this.scale.setValue(-80);
        }
    };

    recordingStarted = (error) => {
        if (error) {
            this.stopRecord();
        }
    };

    postVoiceMessage = () => {
        const {createVoiceMessage, rootId} = this.props;
        const {fsPath} = this.recorder;

        createVoiceMessage(fsPath, rootId).then(({error, remove}) => {
            if (error && remove) {
                RNFetchBlob.fs.unlink(fsPath);
            }
            this.recorder = null;
        });
    };

    onNewPower = ({value}) => {
        this.scale.setValue(value);
    }

    render() {
        const {theme} = this.props;

        const scale = this.scale.interpolate({
            inputRange: [-80, 80],
            outputRange: [1, 25],
        });

        return (
            <TouchableOpacity
                onPressIn={this.startRecord}
                onPressOut={this.stopRecord}
            >
                <Animated.View style={{
                    backgroundColor: 'red',
                    width: 30,
                    height: 30,
                    transform: [{
                        scale,
                    }],
                    borderRadius: 60,
                }}>
                    <Icon
                        name='mic-none'
                        size={24}
                        color={changeOpacity(theme.centerChannelColor, 0.9)}
                    />
                </Animated.View>
            </TouchableOpacity>
        );
    }
}