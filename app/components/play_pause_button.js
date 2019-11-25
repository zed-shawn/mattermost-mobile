// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo} from 'react';
import PropTypes from 'prop-types';
import {Image} from 'react-native';

import TouchableWithFeedback from 'app/components/touchable_with_feedback';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import play from 'assets/images/play.png';
import pause from 'assets/images/pause.png';

function PlayPauseButton(props) {
    const {theme, isPlaying} = props;
    const style = getStyleSheet(theme);

    const src = isPlaying ? pause : play;

    return (
        <TouchableWithFeedback
            onPress={props.onPress}
            type={'none'}
        >
            <Image
                source={src}
                style={style.image}
            />
        </TouchableWithFeedback>
    );
}

PlayPauseButton.propTypes = {
    onPress: PropTypes.func.isRequired,
    isPlaying: PropTypes.bool.isRequired,
    theme: PropTypes.object.isRequired,
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        image: {
            width: 36,
            height: 36,
            tintColor: theme.buttonBg,
        },
    };
});

export default memo(PlayPauseButton);
