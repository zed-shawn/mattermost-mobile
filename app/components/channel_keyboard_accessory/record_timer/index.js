// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Animated, Text} from 'react-native';
import moment from 'moment';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class RecordTimer extends PureComponent {
    static propTypes = {
        timerOpacity: PropTypes.any,
        theme: PropTypes.object,
        translateX: PropTypes.any,
    };

    constructor(props) {
        super(props);

        this.timer = null;
        this.state = {
            time: 0,
        };

        this.dotOpacityValue = new Animated.Value(1);
        this.loop = Animated.loop(
            Animated.timing(this.dotOpacityValue, {
                toValue: this.dotOpacityValue === 0 ? 1 : 0,
                duration: 1200,
                useNativeDriver: true,
            }),
        );
    }

    setTime = () => {
        this.setState({
            time: moment().diff(this.startedAt),
        });
    };

    animateDotOpacity = (start = true) => {
        if (start) {
            this.loop.start();
        } else {
            this.loop.stop();
            this.dotOpacityValue.setValue(1);
        }
    }

    start = () => {
        clearInterval(this.timer);
        this.startedAt = Date.now();
        this.timer = setInterval(this.setTime, 1000);
        this.animateDotOpacity(true);
    }

    stop = () => {
        clearInterval(this.timer);
        this.setState({time: 0});
        this.animateDotOpacity(false);
    }

    render() {
        const {timerOpacity, theme, translateX} = this.props;
        const {time} = this.state;
        const style = getStyleSheet(theme);

        const dotStyle = {opacity: this.dotOpacityValue};
        const timerStyle = {opacity: timerOpacity};
        const recorderInfoStyle = {
            transform: [{translateX}],
        };

        return (
            <Animated.View style={[style.container, recorderInfoStyle]}>
                <Animated.View style={[style.indicator, dotStyle]}></Animated.View>
                <Animated.View style={timerStyle}>
                    <Text style={style.text}>{moment(time).format('mm:ss')}</Text>
                </Animated.View>
            </Animated.View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        alignItems: 'center',
        flexDirection: 'row',
        left: 0,
        marginTop: 12,
        position: 'absolute',
        top: 0,
    },
    text: {
        fontSize: 16,
        color: theme.centerChannelColor,
    },
    indicator: {
        backgroundColor: theme.errorTextColor,
        borderRadius: 5,
        height: 10,
        marginRight: 5,
        width: 10,
    },
}));