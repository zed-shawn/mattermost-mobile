// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
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
import {MediaTypes} from 'app/constants';

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

        const {file} = this.props;
        ImageCacheManager.cache(file.name, Client4.getFileUrl(file.id), emptyFunction).then((uri) => {
            this.setState({uri}, () => {
                this.reloadPlayer();
            });
        });

        this.progressInterval = setInterval(() => {
            if (this.player && this.shouldUpdateProgressBar()) {
                let progress = Math.max(0, this.player.currentTime) / this.player.duration;
                if (isNaN(progress)) {
                    progress = 0;
                }
                this.setState({progress});
            }
        }, 100);
    }

    componentWillUnmount() {
        EventEmitter.off(MediaTypes.STOP_AUDIO, this.pauseIfPlaying);
        clearInterval(this.progressInterval);
        if (this.player?.isPlaying) {
            this.playPause();
        }
    }

    pauseIfPlaying = (fileId) => {
        const {file} = this.props;
        if (file.id !== fileId && this.player?.isPlaying) {
            this.playPause();
        }
    }

    shouldUpdateProgressBar() {
        // Debounce progress bar update by 200 ms
        return Date.now() - this.lastSeek > 200;
    }

    playPause() {
        this.player.playPause((err, paused) => {
            if (!paused) {
                EventEmitter.emit(MediaTypes.STOP_AUDIO, this.props.file.id);
            }
            this.updateState(err?.message);
        });
    }

    stop() {
        this.player.stop(() => {
            this.updateState();
        });
    }

    seek(percentage) {
        if (!this.player) {
            return;
        }

        this.lastSeek = Date.now();

        const position = percentage * this.player.duration;

        this.player.seek(position, () => {
            this.updateState();
        });
    }

    reloadPlayer() {
        if (this.player) {
            this.player.destroy();
        }

        this.player = new Player(`file://${this.state.uri}`, {
            autoDestroy: false,
        }).prepare((error) => {
            if (error) {
                console.log('Error prepring player', error); // eslint-disable-line no-console
            }

            this.updateState(error);
        });

        this.updateState();

        this.player.on('ended', () => {
            this.updateState();
        });
        this.player.on('pause', () => {
            this.updateState();
        });
    }

    updateState(error) {
        this.setState({
            error,
        });
    }

    render() {
        const {theme} = this.props;
        const styles = getStyleSheet(theme);

        return (
            <View style={styles.container}>
                <View style={styles.buttonContainer}>
                    <PlayPauseButton
                        onPress={() => this.playPause()}
                        isPlaying={Boolean(this.player?.isPlaying)}
                        theme={theme}
                    />
                </View>
                <View style={styles.sliderContainer}>
                    <Slider
                        step={0.0001}
                        onValueChange={(percentage) => this.seek(percentage)}
                        value={this.state.progress}
                        minimumTrackTintColor={theme.linkColor}
                        thumbTintColor={theme.linkColor}
                        thumbStyle={{width: 15, height: 15}}
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
    };
});
