// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {
    FlatList,
    StatusBar,
} from 'react-native';

import {ListTypes} from '@constants';
import {getCurrentServerUrl} from '@init/credentials';
import telemetry from '@telemetry';
import tracker from '@utils/time_tracker';
import {removeProtocol} from '@utils/url';

import TeamsListItem from './teams_list_item';

const VIEWABILITY_CONFIG = {
    ...ListTypes.VISIBILITY_CONFIG_DEFAULTS,
    waitForInteraction: true,
};

const TeamsList = (props: any) => {
    const [serverUrl, setServerUrl] = useState('');

    useEffect(() => {
        getCurrentServerUrl().then((url: string) => {
            setServerUrl(removeProtocol(url));
        });
    }, []);

    const flatListTestID = `${props.testID}.flast_list`;

    const selectTeam = (teamId: string) => {
        const {actions, closeMainSidebar, currentTeamId} = props;

        if (teamId !== currentTeamId) {
            telemetry.reset();
            telemetry.start(['team:switch']);
        }

        StatusBar.setHidden(false, 'slide');
        requestAnimationFrame(() => {
            if (teamId !== currentTeamId) {
                tracker.teamSwitch = Date.now();
                actions.handleTeamChange(teamId);
            }
        });

        closeMainSidebar();
    };

    const keyExtractor = (item: any) => {
        return item;
    };

    const renderItem = ({item}: any) => {
        const listItemTestID = `${flatListTestID}.flat_list.teams_list_item`;

        return (
            <TeamsListItem
                testID={listItemTestID}
                currentUrl={serverUrl}
                selectTeam={selectTeam}
                teamId={item}
            />
        );
    };

    return (
        <FlatList
            testID={flatListTestID}
            extraData={serverUrl}
            data={props.teamIds}
            removeClippedSubviews={true}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            viewabilityConfig={VIEWABILITY_CONFIG}
        />
    )
}

export default TeamsList;