// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Animated, Easing} from 'react-native';

const scaleExpand = 3;

export default class RecorderAnimation extends PureComponent {
    static propTypes = {
        theme: PropTypes.object,
    }

    constructor(props) {
        super(props);
        this.state = {
            visible: false,
            expanded: false,
            scale: new Animated.Value(1),
            opacity: new Animated.Value(0),
        };
    }

    animate = (show = true) => {
        Animated.parallel([
            Animated.timing(this.state.scale, {
                toValue: show ? scaleExpand : 0,
                duration: 500,
                easing: Easing.bounce,
                useNativeDriver: true,
            }),
            Animated.timing(this.state.opacity, {
                toValue: show ? 1 : 0,
                duration: 250,
                easing: Easing.linear,
                useNativeDriver: true,
            }),
        ]).start(() => {
            this.setState({expanded: !this.state.expanded});
        });
    }

    render() {
        const {scale, opacity} = this.state;
        return (
            <Animated.View
                style={{
                    position: 'absolute',
                    backgroundColor: this.props.theme.centerChannelColor,
                    opacity,
                    top: 3,
                    right: 0,
                    width: 40,
                    height: 40,
                    borderRadius: 40 / 2,
                    transform: [{
                        scale,
                    }],
                }}
            />
        );
    }
}