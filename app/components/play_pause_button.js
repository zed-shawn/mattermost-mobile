// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo} from 'react';
import {View} from 'react-native';
import PropTypes from 'prop-types';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';

import TouchableWithFeedback from 'app/components/touchable_with_feedback';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

function PlayPauseButton(props) {
    const {theme, isPlaying} = props;
    const style = getStyleSheet(theme);

    let name = 'play';
    let marginLeft = 3;
    if (isPlaying) {
        name = 'pause';
        marginLeft = 0;
    }

    const icon = (
        <FontAwesomeIcon
            name={name}
            color={theme.buttonColor}
            style={{marginLeft}}
        />
    )

    return (
        <TouchableWithFeedback
            onPress={props.onPress}
            style={style.buttonContainer}
            type={'none'}
        >
            <View style={style.button}>
                {icon}
            </View>
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
        buttonContainer: {
            justifyContent: 'flex-end',
            paddingHorizontal: 5,
            paddingVertical: 3,
        },
        button: {
            backgroundColor: theme.buttonBg,
            borderRadius: 18,
            height: 28,
            width: 28,
            alignItems: 'center',
            justifyContent: 'center',
        },
    };
});

export default memo(PlayPauseButton);
