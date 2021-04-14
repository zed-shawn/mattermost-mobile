// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators, Dispatch} from 'redux';
import {connect} from 'react-redux';

import {joinChannel} from '@mm-redux/actions/channels';
import {getTeams} from '@mm-redux/actions/teams';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentTeam, getMyTeamsCount} from '@mm-redux/selectors/entities/teams';
import {getCurrentUser} from '@mm-redux/selectors/entities/users';
import {GenericAction, DispatchFunc, GetStateFunc} from '@mm-redux/types/actions';

import {setChannelDisplayName, handleSelectChannel} from 'app/actions/views/channel';
import {makeDirectChannel} from 'app/actions/views/more_dms';
import telemetry from 'app/telemetry';

import Home from './home';

import { GlobalState } from '@mm-redux/types/store';

export function logChannelSwitch(channelId: string, currentChannelId: string) {
    return (dispatch: DispatchFunc, getState: GetStateFunc) => {
        if (channelId === currentChannelId) {
            return;
        }

        const metrics = [];
        if (getState().entities.posts.postsInChannel[channelId]) {
            metrics.push('channel:switch_loaded');
        } else {
            metrics.push('channel:switch_initial');
        }

        telemetry.reset();
        telemetry.start(metrics);
    };
}

function mapStateToProps(state: GlobalState) {
    const currentUser = getCurrentUser(state);
    const currentTeam = getCurrentTeam(state);

    return {
        locale: currentUser?.locale,
        currentTeamId: currentTeam.id,
        currentTeamName: currentTeam.name,
        currentUserId: currentUser?.id,
        teamsCount: getMyTeamsCount(state),
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch: Dispatch<GenericAction>) {
    return {
        actions: bindActionCreators({
            getTeams,
            joinChannel,
            logChannelSwitch,
            makeDirectChannel,
            setChannelDisplayName,
            handleSelectChannel,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {forwardRef: true})(Home);