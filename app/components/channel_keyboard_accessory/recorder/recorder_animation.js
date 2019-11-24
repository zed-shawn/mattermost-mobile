// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Animated, Easing} from 'react-native';

const scaleExpand = 5;
const scaleShrink = 1;

export default class RecorderAnimation extends PureComponent {
    static propTypes = {
        show: PropTypes.bool,
        locked: PropTypes.bool,
        theme: PropTypes.object,
    }

    // static getDerivedStateFromProps(props, state) {
    //     if (state.visible !== props.show) {

    //         return {
    //             visible: props.show,
    //         };
    //     }
    // }

    constructor(props) {
        super(props);
        this.state = {
            visible: false,
            expanded: false,
            scale: new Animated.Value(0),
        };
    }

    componentDidMount() {
        this.animate();
    }

    animate = () => {
        const toValue = this.state.expanded ? scaleShrink : scaleExpand;
        Animated.timing(this.state.scale, {
            toValue,
            duration: 500,
            easing: Easing.bounce,
            useNativeDriver: true,
        }).start(() => {
            this.setState({expanded: !this.state.expanded});
        });
    }

    getLeftPosition = () => {
        return 0;
    }

    getTopPosition = () => {
        return 4;
    }

    render() {
        const {scale} = this.state;
        return (
            <Animated.View
                style={{
                    position: 'absolute',
                    backgroundColor: 'white',
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