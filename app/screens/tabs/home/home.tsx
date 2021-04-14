// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {Button, Text, View} from 'react-native';

import { goToScreen, showModalOverCurrentContext } from '@actions/navigation';
import CompassIcon from '@components/compass_icon';
import SafeAreaView from '@components/safe_area_view';
import ChannelsList from '@components/sidebars/main/channels_list';
import TeamsList from '@screens/tabs/home/components/teams_list';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import tracker from '@utils/time_tracker';

const getStyleSheet = makeStyleSheetFromTheme((theme: any) => {
    return {
        headerRow: {
            flex: 1,
            flexDirection: "row",
            backgroundColor: theme.sidebarBg,
        },
        teamSelectionColumn: {
            flex: 1,
            flexDirection: "column",
            backgroundColor: theme.sidebarHeaderBg,
            borderTopRightRadius: 10
        },
        contentRow: {
            flex: 10,
            flexDirection: "row",
            backgroundColor: theme.sidebarBg,
        }
    }
});

type HomeProps = {
    actions: any;
    currentTeamId: any;
    currentTeamName: any;
    currentUserId: any;
    locale: any;
    teamsCount: any;
    theme: any;
}

const Home = (props: HomeProps) => {
    useEffect(() => {
        props.actions.getTeams();
    }, []);

    const style = getStyleSheet(props.theme);

    const showServers = () => {
        console.log(props);

        const screen = 'Servers';
        showModalOverCurrentContext(screen);
    }

    const selectChannel = (channel: any, currentChannelId: string, closeDrawer = true) => {
        const {logChannelSwitch, handleSelectChannel} = props.actions;

        if (channel.id === currentChannelId) {
            return;
        }

        logChannelSwitch(channel.id, currentChannelId);

        tracker.channelSwitch = Date.now();

        // if (!channel) {
            // const utils = require('app/utils/general');
            // const intl = this.getIntl();

            // const unableToJoinMessage = {
            //     id: t('mobile.open_unknown_channel.error'),
            //     defaultMessage: "We couldn't join the channel. Please reset the cache and try again.",
            // };
            // const erroMessage = {};

            // utils.alertErrorWithFallback(intl, erroMessage, unableToJoinMessage);
            // return;
        // }

        handleSelectChannel(channel.id);
        goToScreen('Channel', '', {}, {
            topBar: {
                visible: false,
            },
            bottomTabs: {
                visible: false,
            },
        });
    };

    return (
        <SafeAreaView>
            <View style={style.headerRow}>
                <View style={{flex: 1, flexDirection: "column"}}>
                    <View style={{flex: 1, justifyContent: "center", alignItems: "center"}}>
                        <TouchableWithFeedback
                            onPress={showServers}
                            type={'opacity'}
                        >
                            <CompassIcon
                                name="server-outline"
                                size={32}
                                color={changeOpacity(props.theme.centerChannelBg, 0.64)}
                            />
                        </TouchableWithFeedback>
                    </View>
                </View>
                <View style={{flex: 5, flexDirection: "column", justifyContent: "center", marginLeft: 9}}>
                    <Text style={{fontSize: 24, fontWeight: "bold", color: props.theme.sidebarText}}>{props.currentTeamName}</Text>
                </View>
            </View>

            <View style={style.contentRow}>
                <View style={style.teamSelectionColumn}>
                    <TeamsList
                        testID='main.sidebar.teams_list'
                        closeMainSidebar={() => {}}
                    />
                </View>
                <View style={{flex: 5, flexDirection: "column"}}>
                    <ChannelsList
                        onSelectChannel={selectChannel}
                        onJoinChannel={() => {}}
                        onSearchStart={() => {}}
                        onSearchEnds={() => {}}
                        theme={props.theme}
                    />
                </View>
            </View>
        </SafeAreaView>
    )
}

export default Home;