// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Alert, Animated} from 'react-native';
import {Recorder} from '@react-native-community/audio-toolkit';
import Permissions from 'react-native-permissions';
import DeviceInfo from 'react-native-device-info';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {intlShape} from 'react-intl';
import RNFetchBlob from 'rn-fetch-blob';
import {TapGestureHandler, PanGestureHandler, State as GestureState} from 'react-native-gesture-handler';

import {PermissionTypes} from 'app/constants';
import {generateId} from 'app/utils/file';
import {changeOpacity} from 'app/utils/theme';

import RecorderAnimation from './recorder_animation';

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
        this.panRef = React.createRef();
        this.state = {
            what: false,
        };
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

    cancelRecording = () => {
        console.warn('cancel recording'); // eslint-disable-line no-console
        if (this.recorder) {
            this.recorder.destroy();
            this.deleteRecording();
            this.recorder = null;
        }
    };

    deleteRecording = () => {
        if (this.recorder.fsPath) {
            RNFetchBlob.fs.unlink(this.recorder.fsPath);
        }
    }

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

            if (this.recorder.fsPath) {
                this.scale.setValue(-80);
                this.postVoiceMessage();
            }
        }
    };

    recordingStarted = (error) => {
        if (error && this.recorder) {
            this.cancelRecording();
        }
    };

    postVoiceMessage = () => {
        const {createVoiceMessage, rootId} = this.props;
        const {fsPath} = this.recorder;

        createVoiceMessage(fsPath, rootId).then(({error, remove}) => {
            if (error && remove) {
                this.deleteRecording();
            }
            this.recorder = null;
        });
    };

    onNewPower = ({value}) => {
        this.scale.setValue(value);
    };

    onPanHandlerStateChange = ({nativeEvent}) => {
        switch (nativeEvent.state) {
        case GestureState.UNDETERMINED:
            console.log('PAN undetermined', nativeEvent.state); // eslint-disable-line no-console
            break;
        case GestureState.FAILED:
            console.log('PAN failed', nativeEvent.state); // eslint-disable-line no-console
            break;
        case GestureState.BEGAN:
            console.log('PAN began', nativeEvent.state); // eslint-disable-line no-console
            break;
        case GestureState.CANCELLED:
            console.log('PAN cancelled', nativeEvent.state); // eslint-disable-line no-console
            break;
        case GestureState.ACTIVE:
            console.log('PAN active', nativeEvent.state); // eslint-disable-line no-console
            break;
        case GestureState.END:
            console.log('PAN end', nativeEvent.state); // eslint-disable-line no-console
            break;
        }
    };

    onTapHandlerStateChange = ({nativeEvent}) => {
        switch (nativeEvent.state) {
        case GestureState.UNDETERMINED:
            console.log('undetermined', nativeEvent.state); // eslint-disable-line no-console
            break;
        case GestureState.FAILED:
            this.setState({what: false});
            this.cancelRecording();
            console.log('failed', nativeEvent.state); // eslint-disable-line no-console
            break;
        case GestureState.BEGAN:
            this.setState({what: true});

            // this.startRecord();
            console.log('began', nativeEvent.state); // eslint-disable-line no-console
            break;
        case GestureState.CANCELLED:
            console.log('cancelled', nativeEvent.state); // eslint-disable-line no-console
            break;
        case GestureState.ACTIVE:
            console.log('active', nativeEvent.state); // eslint-disable-line no-console
            break;
        case GestureState.END:
            this.setState({what: false});
            this.stopRecord();
            console.log('end', nativeEvent.state); // eslint-disable-line no-console
            break;
        }
    }

    onPanGestureEvent = ({nativeEvent}) => {
        console.log('translationX', nativeEvent.translationX); // eslint-disable-line no-console
        if (nativeEvent.translationX < -60) {
            this.cancelRecording();
        }
    }

    render() {
        const {theme} = this.props;

        const scale = this.scale.interpolate({
            inputRange: [-80, 80],
            outputRange: [1, 25],
        });

        const icon = (
            <Icon
                name='mic-none'
                size={40}
                color={changeOpacity(theme.centerchannelColor, 0.9)}
                style={{top: 9, left: 1, zIndex: 500}}
            />
        );

        return (
            <React.Fragment>
                <TapGestureHandler
                    onHandlerStateChange={this.onTapHandlerStateChange}
                    simultaneousHandlers={this.panRef}
                >
                    <PanGestureHandler
                        ref={this.panRef}
                        onHandlerStateChange={this.onPanHandlerStateChange}
                        onGestureEvent={this.onPanGestureEvent}
                    >
                        {icon}
                    </PanGestureHandler>
                </TapGestureHandler>
                <RecorderAnimation
                    show={this.recorder?.isRecording}
                    lock={this.state.lock}
                />
                <Animated.View
                    style={{
                        backgroundColor: 'red',
                        width: 30,
                        height: 30,
                        transform: [{
                            scale,
                        }],
                        borderRadius: 60,
                    }}
                />
            </React.Fragment>
        );
    }
}