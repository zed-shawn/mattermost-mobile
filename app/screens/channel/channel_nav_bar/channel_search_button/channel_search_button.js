// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Keyboard,
    TouchableOpacity,
    View,
} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {preventDoubleTap} from '@utils/tap';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {showSearchModal} from '@actions/navigation';

export default class ChannelSearchButton extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            clearSearch: PropTypes.func.isRequired,
        }).isRequired,
        theme: PropTypes.object,
    };

    handlePress = preventDoubleTap(async () => {
        const {actions} = this.props;

        Keyboard.dismiss();
        await actions.clearSearch();
        showSearchModal();
    });

    render() {
        const {
            theme,
        } = this.props;

        const style = getStyle(theme);

        return (
            <View style={style.container}>
                <TouchableOpacity
                    onPress={this.handlePress}
                    style={style.flex}
                >
                    <View style={style.wrapper}>
                        <CompassIcon
                            name='magnify'
                            size={18}
                            style={style.icon}
                        />
                    </View>
                </TouchableOpacity>
            </View>
        );
    }
}

const getStyle = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            width: 40,
        },
        flex: {
            flex: 1,
        },
        wrapper: {
            position: 'relative',
            top: -1,
            alignItems: 'flex-end',
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center',
        },
        icon: {
            backgroundColor: theme.sidebarHeaderBg,
            color: theme.sidebarHeaderTextColor,
        },
    };
});
