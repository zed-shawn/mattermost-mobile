// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    View,
} from 'react-native';
import Slider from 'react-native-slider';
import {Player} from '@react-native-community/audio-toolkit';

import {Client4} from 'mattermost-redux/client';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import PlayPauseButton from 'app/components/play_pause_button';
import ImageCacheManager from 'app/utils/image_cache_manager';
import {makeStyleSheetFromTheme} from 'app/utils/theme';
import {emptyFunction} from 'app/utils/general';
import {DeviceTypes, MediaTypes} from 'app/constants';
const {AUDIO_PATH} = DeviceTypes;

export default class FileAttachmentAudio extends PureComponent {
    static propTypes = {
        file: PropTypes.object.isRequired,
        autoDownload: PropTypes.bool.isRequired,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            uri: null,
            progress: 0,
            error: null,
        };

        this.player = null;
        this.lastSeek = 0;
    }

    componentDidMount() {
        EventEmitter.on(MediaTypes.STOP_AUDIO, this.pauseIfPlaying);

        this.progressInterval = setInterval(this.updateProgress, 100);
        this.loadAudio();
    }

    componentWillUnmount() {
        EventEmitter.off(MediaTypes.STOP_AUDIO, this.pauseIfPlaying);
        clearInterval(this.progressInterval);
        if (this.player) {
            this.player.destroy();
        }
    }

    loadAudio = async () => {
        const {file} = this.props;
        let uri;

        if (file.localPath) {
            uri = file.localPath.startsWith('file://') ? file.localPath : `file://${file.localPath}`;
        } else {
            uri = await ImageCacheManager.cache(file.name, Client4.getFileUrl(file.id), emptyFunction, AUDIO_PATH);
            if (Platform.OS === 'ios') {
                uri = `file://${uri}`;
            }
        }

        this.setState({uri}, this.reloadPlayer);
    }

    pauseIfPlaying = (fileId) => {
        const {file} = this.props;
        if (file.id !== fileId && this.player?.isPlaying) {
            this.playPause();
        }
    }

    updateProgress = () => {
        if (this.player && this.shouldUpdateProgressBar()) {
            let progress = Math.max(0, this.player.currentTime) / this.player.duration;
            if (isNaN(progress)) {
                progress = 0;
            }
            this.setState({progress});
        }
    };

    shouldUpdateProgressBar = () => {
        // Debounce progress bar update by 200 ms
        return Date.now() - this.lastSeek > 200;
    }

    playPause = () => {
        if (this.state.uri) {
            this.player.playPause((err, paused) => {
                if (!paused) {
                    EventEmitter.emit(MediaTypes.STOP_AUDIO, this.props.file.id);
                }
                this.updateState(err?.message);
            });
        }
    }

    stop = () => {
        if (!this.player) {
            return;
        }

        this.player.stop(() => {
            this.updateState();
        });
    }

    seek = (percentage) => {
        if (!this.player) {
            return;
        }

        const position = percentage * this.player.duration;
        this.lastSeek = Date.now();

        this.player.seek(position, () => {
            this.updateState();
        });
    }

    reloadPlayer = () => {
        if (!this.state.uri) {
            return;
        }

        if (this.player) {
            this.player.destroy();
        }

        this.player = new Player(this.state.uri, {
            autoDestroy: false,
        }).prepare((error) => {
            if (error) {
                console.log('Error prepring player', error); // eslint-disable-line no-console
            }

            this.updateState(error);
        });

        this.player.on('ended', () => {
            this.updateState();
        });

        this.player.on('pause', () => {
            this.updateState();
        });

        this.updateState();
    }

    updateState = (error) => {
        this.setState({
            error,
        });
    }

    updatePercentage = (percentage) => this.seek(percentage);

    render() {
        const {theme} = this.props;
        const styles = getStyleSheet(theme);

        return (
            <View style={styles.container}>
                <View style={styles.buttonContainer}>
                    <PlayPauseButton
                        onPress={this.playPause}
                        isPlaying={Boolean(this.player?.isPlaying)}
                        theme={theme}
                    />
                </View>
                <View style={styles.sliderContainer}>
                    <Slider
                        step={0.0001}
                        onValueChange={this.updatePercentage}
                        value={this.state.progress}
                        minimumTrackTintColor={theme.linkColor}
                        thumbTintColor={theme.linkColor}
                        thumbStyle={styles.thumb}
                    />
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        buttonContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
        },
        sliderContainer: {
            flex: 11,
            marginLeft: 10,
            justifyContent: 'center',
        },
        thumb: {
            height: 15,
            width: 15,
        },
    };
});
