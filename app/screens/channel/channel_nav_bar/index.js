// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {
    favoriteChannel,
    unfavoriteChannel,
    updateChannelNotifyProps,
} from 'mattermost-redux/actions/channels';
import {
    getCurrentChannelId,
    getCurrentChannelStats,
    getMyCurrentChannelMembership,
    getSortedFavoriteChannelIds,
} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {isChannelMuted} from 'mattermost-redux/utils/channel_utils';

import {isLandscape} from 'app/selectors/device';

import ChannelNavBar from './channel_nav_bar';

function mapStateToProps(state) {
    const currentChannelId = getCurrentChannelId(state);
    const currentChannelMember = getMyCurrentChannelMembership(state);
    const favoriteChannels = getSortedFavoriteChannelIds(state);
    const isFavorite = favoriteChannels && favoriteChannels.indexOf(currentChannelId) > -1;
    const currentChannelStats = getCurrentChannelStats(state);
    const currentChannelPinnedPostCount = currentChannelStats && currentChannelStats.pinnedpost_count;

    return {
        currentChannelId,
        currentChannelPinnedPostCount,
        currentUserId: getCurrentUserId(state),
        isChannelMuted: isChannelMuted(currentChannelMember),
        isFavorite,
        isLandscape: isLandscape(state),
        theme: getTheme(state),
    };
}

const mapDispatchToProps = {
    favoriteChannel,
    unfavoriteChannel,
    updateChannelNotifyProps,
};

export default connect(mapStateToProps, mapDispatchToProps)(ChannelNavBar);
