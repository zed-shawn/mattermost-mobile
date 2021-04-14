// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    TouchableHighlight,
    View,
} from 'react-native';

import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import TeamIcon from '@components/team_icon';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type TeamsListItemProps = {
    testID: string;
    currentTeamId: string;
    currentUrl: string;
    displayName: string;
    mentionCount: number;
    name: string;
    selectTeam: any;
    teamId: string;
    theme: any;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: any) => {
    return {
        teamWrapper: {
            marginTop: 10,
        },
        teamContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            marginHorizontal: 16,
            paddingVertical: 10,
        },
        teamNameContainer: {
            flex: 1,
            flexDirection: 'column',
            marginLeft: 10,
        },
        teamName: {
            color: theme.sidebarText,
            fontSize: 18,
        },
        teamIconContainer: {
            width: 40,
            height: 40,
            backgroundColor: '#ffffff',
        },
        teamIconText: {
            fontSize: 18,
        },
        teamUrl: {
            color: changeOpacity(theme.sidebarText, 0.5),
            fontSize: 12,
        },
        checkmarkContainer: {
            alignItems: 'flex-end',
        },
        checkmark: {
            color: theme.sidebarText,
            fontSize: 20,
        },
        badge: {
            backgroundColor: theme.mentionBg,
            height: 20,
            padding: 3,
        },
        smallBadge: {
            backgroundColor: theme.mentionBg,
            height: 8,
            padding: 3,
        },
        badgeContainer: {
            borderColor: theme.sidebarBg,
            borderRadius: 14,
            borderWidth: 2,
            position: 'absolute',
            right: -12,
            top: -10,
        },
        smallBadgeContainer: {
            borderColor: theme.sidebarBg,
            borderRadius: 14,
            borderWidth: 2,
            position: 'absolute',
            right: -7,
            top: -6,
        },
        mention: {
            color: theme.mentionColor,
            fontSize: 10,
            fontWeight: 'bold',
        },
    };
});

const TeamsListItem = (props: TeamsListItemProps) => {
    const selectTeam = preventDoubleTap(() => {
        props.selectTeam(props.teamId);
    });

    const {
        testID,
        currentTeamId,
        currentUrl,
        displayName,
        mentionCount,
        name,
        teamId,
        theme,
    } = props;
    const styles = getStyleSheet(theme);

    const lowMentionCount = mentionCount <= 0;
    const minWidth = lowMentionCount ? 8 : 20;
    const badgeStyle = lowMentionCount ? styles.smallBadge : styles.badge;
    const containerStyle = lowMentionCount ? styles.smallBadgeContainer : styles.badgeContainer;
    const badgeTestID = `${testID}.badge`;

    const badge = (
        <Badge
            testID={badgeTestID}
            containerStyle={containerStyle}
            countStyle={styles.mention}
            count={mentionCount}
            minWidth={minWidth}
            style={badgeStyle}
        />
    );

    let current;
    if (teamId === currentTeamId) {
        const currentTestID = `${testID}.current`;

        current = (
            <View
                testID={currentTestID}
                style={styles.checkmarkContainer}
            >
                <CompassIcon
                    name='check'
                    style={styles.checkmark}
                />
            </View>
        );
    }

    const itemTestID = `${testID}.${teamId}`;
    const displayNameTestID = `${testID}.display_name`;
    const teamIconTestID = `${testID}.team_icon`;

    return (
        <View
            testID={testID}
            style={styles.teamWrapper}
        >
            <TouchableHighlight
                underlayColor={changeOpacity(props.theme.sidebarTextHoverBg, 0.5)}
                onPress={selectTeam}
            >
                <View
                    testID={itemTestID}
                    style={styles.teamContainer}
                >
                    <View>
                        <TeamIcon
                            testID={teamIconTestID}
                            teamId={teamId}
                            styleContainer={styles.teamIconContainer}
                            styleText={styles.teamIconText}
                            theme={theme}
                        />
                        {badge}
                    </View>
                    <View style={styles.teamNameContainer}>
                        <Text
                            testID={displayNameTestID}
                            numberOfLines={1}
                            ellipsizeMode='tail'
                            style={styles.teamName}
                        >
                            {displayName}
                        </Text>
                        <Text
                            numberOfLines={1}
                            ellipsizeMode='tail'
                            style={styles.teamUrl}
                        >
                            {`${currentUrl}/${name}`}
                        </Text>
                    </View>
                    {current}
                </View>
            </TouchableHighlight>
        </View>
    );
}

export default TeamsListItem;
