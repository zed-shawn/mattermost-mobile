// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Animated} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import FormattedText from 'app/components/formatted_text';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class SlideToCancelRecording extends PureComponent {
    static propTypes = {
        theme: PropTypes.object,
        translateX: PropTypes.any,
        opacity: PropTypes.any,
    };

    render() {
        const {theme, translateX, opacity} = this.props;
        const style = getStyleSheet(theme);

        const slideToCancelStyle = {
            transform: [{translateX}],
            opacity,
        };

        return (
            <Animated.View style={[style.container, slideToCancelStyle]}>
                <MaterialIcons
                    name='chevron-left'
                    size={40}
                    color={theme.centerChannelColor}
                    style={style.icon}
                />
                <FormattedText
                    id={'mobile.voice_message.slide'}
                    defaultMessage={'Slide to cancel'}
                    style={style.text}
                />
            </Animated.View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flexDirection: 'row',
        marginTop: 12,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    text: {
        fontSize: 16,
        color: theme.centerChannelColor,
    },
    icon: {
        right: -10,
        top: -10,
    },
}));