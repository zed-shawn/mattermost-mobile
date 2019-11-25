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

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {MediaTypes, PermissionTypes} from 'app/constants';
import {generateId} from 'app/utils/file';
import {changeOpacity} from 'app/utils/theme';

import RecorderAnimation from './recorder_animation';

const AnimatedIcon = Animated.createAnimatedComponent(Icon);

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
        this.iconColor = new Animated.Value(0);
        this.panRef = React.createRef();
        this.recorderAnimationRef = React.createRef();
        this.state = {
            what: false,
        };
    }

    startAnimation(show = true) {
        if (this.recorderAnimationRef.current) {
            if (!show) {
                this.scale.setValue(-80);
            }
            const toValue = show ? 1 : 0;
            this.recorderAnimationRef.current.animate(show);
            Animated.timing(
                this.iconColor, {
                    toValue,
                    duration: 250,
                }
            ).start();
        }
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
        this.startAnimation(false);

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

        EventEmitter.emit(MediaTypes.STOP_AUDIO, null);
        this.startAnimation(true);
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
        this.startAnimation(false);

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
            this.cancelRecording();
            console.log('failed', nativeEvent.state); // eslint-disable-line no-console
            break;
        case GestureState.BEGAN:
            this.setState({what: true});

            this.startRecord();
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
            inputRange: [-80, 1],
            outputRange: [0, 8],
        });

        const color = this.iconColor.interpolate({
            inputRange: [0, 1],
            outputRange: [changeOpacity(theme.centerChannelColor, 0.9), theme.centerChannelBg],
        });

        const icon = (
            <AnimatedIcon
                name='mic-none'
                size={30}
                style={{zIndex: 500, right: 5, color}}
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
                <Animated.View
                    style={{
                        position: 'absolute',
                        opacity: 0.1,
                        backgroundColor: theme.centerChannelColor,
                        width: 40,
                        height: 40,
                        top: 3,
                        right: 0,
                        transform: [{
                            scale,
                        }],
                        borderRadius: 50,
                    }}
                />
                <RecorderAnimation
                    ref={this.recorderAnimationRef}
                    theme={theme}
                />
            </React.Fragment>
        );
    }
}