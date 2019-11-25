// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Animated, Text} from 'react-native';
import moment from 'moment';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class RecordTimer extends PureComponent {
    static propTypes = {
        opacity: PropTypes.any,
        theme: PropTypes.object,
        translateX: PropTypes.any,
    };

    constructor(props) {
        super(props);

        this.timer = null;
        this.state = {
            time: 0,
        };
    }

    setTime = () => {
        this.setState({
            time: moment().diff(this.startedAt),
        });
    };

    start = () => {
        clearInterval(this.timer);
        this.startedAt = Date.now();
        this.timer = setInterval(this.setTime, 1000);
    }

    stop = () => {
        clearInterval(this.timer);
        this.setState({time: 0});
    }

    render() {
        const {opacity, theme, translateX} = this.props;
        const {time} = this.state;
        const style = getStyleSheet(theme);

        const recordStyle = {opacity};
        const recorderInfoStyle = {
            transform: [{translateX}],
        };

        return (
            <Animated.View style={[style.container, recorderInfoStyle]}>
                <Animated.View style={[style.indicator, recordStyle]}></Animated.View>
                <Text>{moment(time).format('mm:ss')}</Text>
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