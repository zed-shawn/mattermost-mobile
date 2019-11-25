// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    View,
    Text,
} from 'react-native';
import Slider from 'react-native-slider';
import {Player} from '@react-native-community/audio-toolkit';
import moment from 'moment';

import {Client4} from 'mattermost-redux/client';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import PlayPauseButton from 'app/components/play_pause_button';
import ImageCacheManager from 'app/utils/image_cache_manager';
import {makeStyleSheetFromTheme} from 'app/utils/theme';
import {emptyFunction} from 'app/utils/general';
import {DeviceTypes, MediaTypes} from 'app/constants';
const {AUDIO_PATH} = DeviceTypes;

export default class FileAttachmentVoiceMessage extends PureComponent {
    static propTypes = {
        file: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            uri: null,
            progress: 0,
            error: null,
            isPlaying: false,
            duration: '00:00',
        };

        this.player = null;
        this.lastSeek = 0;
        this.mounted = false;
    }

    componentDidMount() {
        this.mounted = true;
        EventEmitter.on(MediaTypes.STOP_AUDIO, this.pauseIfPlaying);
        this.loadAudio();
    }

    componentWillUnmount() {
        this.mounted = false;
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

        if (this.mounted) {
            this.setState({uri}, () => {
                this.reloadPlayer();
            });
        }
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

            let duration = '00:00';
            if (this.player.isPlaying || this.player.isPaused) {
                duration = moment(this.player.currentTime).format('mm:ss');
            } else if (this.player.duration !== -1) {
                duration = moment(this.player.duration).format('mm:ss');
            }

            if (this.mounted) {
                this.setState({progress, duration});
            }
        }
    };

    shouldUpdateProgressBar = () => {
        // Debounce progress bar update by 200 ms
        return Date.now() - this.lastSeek > 200;
    }

    playPause = () => {
        if (this.state.uri) {
            if (!this.player) {
                this.reloadPlayer();
            }

            this.player.playPause((err, paused) => {
                if (!paused) {
                    EventEmitter.emit(MediaTypes.STOP_AUDIO, this.props.file.id);
                    this.progressInterval = setInterval(this.updateProgress, 100);
                } else {
                    clearInterval(this.progressInterval);
                }

                if (this.mounted) {
                    this.setState({
                        error: err?.message,
                        isPlaying: !paused,
                    });
                }
            });
        }
    }

    seek = (percentage) => {
        if (!this.player) {
            return;
        }

        const position = percentage * this.player.duration;
        this.lastSeek = Date.now();

        this.player.seek(position);
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
            if (error && this.mounted) {
                this.setState({error});
            } else {
                this.player.seek(0, () => {
                    if (this.mounted) {
                        this.setState({
                            duration: moment(this.player.duration).format('mm:ss'),
                        });
                    }
                });
            }
        });

        this.player.on('ended', () => {
            clearInterval(this.progressInterval);
            setTimeout(() => {
                if (this.mounted) {
                    this.setState({
                        isPlaying: false,
                        progress: 0,
                    });
                }
            }, 250);
        });
    }

    updatePercentage = (percentage) => this.seek(percentage);

    render() {
        const {theme} = this.props;
        const styles = getStyleSheet(theme);

        return (
            <View
                style={styles.container}
            >
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
                        minimumTrackTintColor={theme.buttonBg}
                        thumbTintColor={theme.buttonBg}
                        thumbStyle={styles.thumb}
                        trackStyle={styles.track}
                        style={styles.slider}
                    />
                    <Text style={styles.time}>{this.state.duration}</Text>
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
        },
        buttonContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
        },
        sliderContainer: {
            flex: 1,
            flexDirection: 'row',
            marginLeft: 10,
            justifyContent: 'center',
        },
        slider: {
            flex: 1,
        },
        thumb: {
            height: 12,
            width: 12,
        },
        track: {
            height: 2,
        },
        time: {
            marginTop: 12,
            marginLeft: 10,
            fontSize: 13,
            color: theme.centerChannelColor,
        }
    };
});
