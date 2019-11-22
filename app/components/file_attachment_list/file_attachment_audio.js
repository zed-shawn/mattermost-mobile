// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    View,
} from 'react-native';
import Slider from '@react-native-community/slider';
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
            error: null
        };
    }

    async componentDidMount() {
        EventEmitter.on(MediaTypes.STOP_AUDIO, this.pauseIfPlaying);
        const {file} = this.props;
        const uri = await ImageCacheManager.cache(file.name, Client4.getFileUrl(file.id), emptyFunction);
        this.setState({uri});

        this.player = null;
        this.lastSeek = 0;
    
        this._reloadPlayer();
    
        this._progressInterval = setInterval(() => {
            if (this.player && this._shouldUpdateProgressBar()) {
                let currentProgress = Math.max(0, this.player.currentTime) / this.player.duration;
                if (isNaN(currentProgress)) {
                    currentProgress = 0;
                }
                this.setState({ progress: currentProgress });
            }
        }, 100);
    }
    
    componentWillUnmount() {
        EventEmitter.off(MediaTypes.STOP_AUDIO, this.pauseIfPlaying);
        clearInterval(this._progressInterval);
        if (this.player.isPlaying) {
            this._playPause();
        }
    }

    pauseIfPlaying = (fileId) => {
        const {file} = this.props;
        if (file.id !== fileId && this.player.isPlaying) {
            this._playPause();
        }
    }

    _shouldUpdateProgressBar() {
        // Debounce progress bar update by 200 ms
        return Date.now() - this.lastSeek > 200;
    }

    _playPause() {
        this.player.playPause((err, paused) => {
            if (!paused) {
                EventEmitter.emit(MediaTypes.STOP_AUDIO, this.props.file.id);
            }
            this._updateState(err?.message);
        });
    }
    
    _stop() {
        this.player.stop(() => {
            this._updateState();
        });
    }

    _seek(percentage) {
        if (!this.player) {
            return;
        }
    
        this.lastSeek = Date.now();
    
        let position = percentage * this.player.duration;
    
        this.player.seek(position, () => {
            this._updateState();
        });
    }

    _reloadPlayer() {
        if (this.player) {
            this.player.destroy();
        }
    
        this.player = new Player(`file://${this.state.uri}`, {
            autoDestroy: false
        }).prepare((error) => {
            if (error) {
                console.log('error at _reloadPlayer():', error);
            }

            this._updateState(error);
        });
    
        this._updateState();
    
        this.player.on('ended', () => {
            this._updateState();
        });
        this.player.on('pause', () => {
            this._updateState();
        });
    }

    _updateState(error) {
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
                        onPress={() => this._playPause()}
                        isPlaying={Boolean(this.player?.isPlaying)}
                        theme={theme}
                    />
                </View>
                <View style={styles.sliderContainer}>
                    <Slider
                        step={0.0001}
                        onValueChange={(percentage) => this._seek(percentage)}
                        value={this.state.progress}
                        minimumTrackTintColor={theme.centerChannelColor}
                        thumbTintColor={theme.buttonColor}
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
    }
});
