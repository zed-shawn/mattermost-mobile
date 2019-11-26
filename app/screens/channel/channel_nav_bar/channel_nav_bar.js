// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Dimensions, Image, Platform, TouchableOpacity, View} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import * as Animatable from 'react-native-animatable';
import Icon from 'react-native-vector-icons/FontAwesome';
import {intlShape} from 'react-intl';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {goToScreen} from 'app/actions/navigation';
import {DeviceTypes, ViewTypes} from 'app/constants';
import Badge from 'app/components/badge';
import FormattedText from 'app/components/formatted_text';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import mattermostManaged from 'app/mattermost_managed';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import ChannelDrawerButton from './channel_drawer_button';
import ChannelSearchButton from './channel_search_button';
import ChannelTitle from './channel_title';
import SettingDrawerButton from './settings_drawer_button';

import pinIcon from 'assets/images/channel_info/pin.png';

const {
    ANDROID_TOP_LANDSCAPE,
    ANDROID_TOP_PORTRAIT,
    IOS_TOP_LANDSCAPE,
    IOS_TOP_PORTRAIT,
    STATUS_BAR_HEIGHT,
} = ViewTypes;

export default class ChannelNavBar extends PureComponent {
    static propTypes = {
        currentChannelId: PropTypes.string,
        currentUserId: PropTypes.string,
        currentChannelPinnedPostCount: PropTypes.number,
        favoriteChannel: PropTypes.func.isRequired,
        isChannelMuted: PropTypes.bool,
        isFavorite: PropTypes.bool,
        isLandscape: PropTypes.bool.isRequired,
        openChannelDrawer: PropTypes.func.isRequired,
        openSettingsDrawer: PropTypes.func.isRequired,
        onPress: PropTypes.func.isRequired,
        unfavoriteChannel: PropTypes.func.isRequired,
        updateChannelNotifyProps: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    static getDerivedStateFromProps(props, state) {
        if (props.isChannelMuted !== state.isMuted) {
            return {
                isMuted: props.isChannelMuted,
            };
        } else if (props.isFavorite !== state.isFavorite) {
            return {
                isFavorite: props.isFavorite,
            };
        }

        return null;
    }

    constructor(props) {
        super(props);

        this.state = {
            isSplitView: false,
            fade: '',
            show: false,
            opened: false,
        };
    }

    componentDidMount() {
        this.mounted = true;
        this.handleDimensions();
        this.handlePermanentSidebar();
        Dimensions.addEventListener('change', this.handleDimensions);
        EventEmitter.on(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS, this.handlePermanentSidebar);
    }

    componentWillUnmount() {
        this.mounted = false;
        Dimensions.removeEventListener('change', this.handleDimensions);
        EventEmitter.off(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS, this.handlePermanentSidebar);
    }

    handleDimensions = () => {
        if (DeviceTypes.IS_TABLET && this.mounted) {
            mattermostManaged.isRunningInSplitView().then((result) => {
                const isSplitView = Boolean(result.isSplitView);
                this.setState({isSplitView});
            });
        }
    };

    handlePermanentSidebar = () => {
        if (DeviceTypes.IS_TABLET && this.mounted) {
            AsyncStorage.getItem(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS).then((enabled) => {
                this.setState({permanentSidebar: enabled === 'true'});
            });
        }
    };

    toggleQuickActions = () => {
        if (this.state.show) {
            this.setState({fade: 'fadeOutUp', opened: false});
        } else {
            this.setState({fade: 'fadeInDown', show: true, opened: true});
        }
    }

    handleChannelInfo = () => {
        this.toggleQuickActions();
        this.props.onPress();
    }

    goToPinnedPosts = preventDoubleTap(() => {
        const {currentChannelId} = this.props;
        const {formatMessage} = this.context.intl;
        const id = 'channel_header.pinnedPosts';
        const defaultMessage = 'Pinned Posts';
        const screen = 'PinnedPosts';
        const title = formatMessage({id, defaultMessage});
        const passProps = {
            currentChannelId,
        };

        this.toggleQuickActions();
        goToScreen(screen, title, passProps);
    });

    handleMuteChannel = preventDoubleTap(() => {
        const {updateChannelNotifyProps, currentChannelId, currentUserId, isChannelMuted} = this.props;
        const opts = {
            mark_unread: isChannelMuted ? 'all' : 'mention',
        };

        this.setState({isMuted: !isChannelMuted});
        updateChannelNotifyProps(currentUserId, currentChannelId, opts);
    });

    handleFavorite = preventDoubleTap(() => {
        const {isFavorite, favoriteChannel, unfavoriteChannel, currentChannelId} = this.props;
        const toggleFavorite = isFavorite ? unfavoriteChannel : favoriteChannel;
        this.setState({isFavorite: !isFavorite});
        toggleFavorite(currentChannelId);
    });

    render() {
        const {isLandscape, theme} = this.props;
        const {openChannelDrawer, openSettingsDrawer} = this.props;
        const style = getStyleFromTheme(theme);

        let height;
        let canHaveSubtitle = true;
        switch (Platform.OS) {
        case 'android':
            height = ANDROID_TOP_PORTRAIT;
            if (DeviceTypes.IS_TABLET) {
                height = ANDROID_TOP_LANDSCAPE;
            }
            break;
        case 'ios':
            height = IOS_TOP_PORTRAIT - STATUS_BAR_HEIGHT;
            if (DeviceTypes.IS_TABLET && isLandscape) {
                height -= 1;
            } else if (isLandscape) {
                height = IOS_TOP_LANDSCAPE;
                canHaveSubtitle = false;
            }

            if (DeviceTypes.IS_IPHONE_WITH_INSETS && isLandscape) {
                canHaveSubtitle = false;
            }
            break;
        }

        let drawerButtonVisible = false;
        if (!DeviceTypes.IS_TABLET || this.state.isSplitView || !this.state.permanentSidebar) {
            drawerButtonVisible = true;
        }

        let muted;
        if (this.state.isMuted) {
            muted = (
                <TouchableOpacity
                    onPress={this.handleMuteChannel}
                    style={style.optionContainer}
                >
                    <Icon
                        name={'bell-o'}
                        size={26}
                        color={theme.sidebarHeaderTextColor}
                    />
                    <FormattedText
                        style={style.optionText}
                        id='mobile.channel_info.unmute'
                        defaultMessage='Unmute'
                    />
                </TouchableOpacity>
            );
        } else {
            muted = (
                <TouchableOpacity
                    onPress={this.handleMuteChannel}
                    style={[style.optionContainer, {marginLeft: 0}]}
                >
                    <Icon
                        name={'bell-slash-o'}
                        size={26}
                        color={theme.sidebarHeaderTextColor}
                    />
                    <FormattedText
                        style={style.optionText}
                        id='channel_notifications.mute.settings'
                        defaultMessage='Mute'
                    />
                </TouchableOpacity>
            );
        }

        let favorite;
        if (this.state.isFavorite) {
            favorite = (
                <TouchableOpacity
                    onPress={this.handleFavorite}
                    style={style.optionContainer}
                >
                    <Icon
                        name={'star'}
                        size={26}
                        color={theme.sidebarHeaderTextColor}
                    />
                    <FormattedText
                        style={style.optionText}
                        id='mobile.channel_info.unmute'
                        defaultMessage='Unfavorite'
                    />
                </TouchableOpacity>
            );
        } else {
            favorite = (
                <TouchableOpacity
                    onPress={this.handleFavorite}
                    style={style.optionContainer}
                >
                    <Icon
                        name={'star-o'}
                        size={26}
                        color={theme.sidebarHeaderTextColor}
                    />
                    <FormattedText
                        style={style.optionText}
                        id='mobile.routes.channelInfo.favorite'
                        defaultMessage='Favorite'
                    />
                </TouchableOpacity>
            );
        }

        let badge;
        if (this.props.currentChannelPinnedPostCount) {
            badge = (
                <Badge
                    containerStyle={style.badgeContainer}
                    style={style.badge}
                    countStyle={style.mention}
                    count={this.props.currentChannelPinnedPostCount}
                    minWidth={18}
                />
            );
        }

        return (
            <React.Fragment>
                <View style={[style.header, padding(isLandscape), {height}]}>
                    <ChannelDrawerButton
                        openDrawer={openChannelDrawer}
                        visible={drawerButtonVisible}
                    />
                    <ChannelTitle
                        quickActionsVisible={this.state.opened}
                        onPress={this.toggleQuickActions}
                        canHaveSubtitle={canHaveSubtitle}
                    />
                    <ChannelSearchButton
                        theme={theme}
                    />
                    <SettingDrawerButton openDrawer={openSettingsDrawer}/>
                </View>
                {this.state.show &&
                <Animatable.View
                    style={style.options}
                    animation={this.state.fade}
                    duration={300}
                    delay={0}
                    useNativeDriver={true}
                    onAnimationEnd={() => {
                        if (this.state.fade === 'fadeOutUp') {
                            setTimeout(() => {
                                this.setState({show: false});
                            }, 300);
                        }
                    }}
                >
                    {favorite}
                    {muted}
                    <TouchableOpacity
                        style={style.optionContainer}
                        onPress={this.goToPinnedPosts}
                    >
                        {badge}
                        <Image
                            source={pinIcon}
                            style={style.optionImage}
                        />
                        <FormattedText
                            style={style.optionText}
                            id='mobile.channel_header.pinned'
                            defaultMessage='Pinned'
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={this.handleChannelInfo}
                        style={style.optionContainer}
                    >
                        <Icon
                            name={'info-circle'}
                            size={26}
                            color={theme.sidebarHeaderTextColor}
                        />
                        <FormattedText
                            style={style.optionText}
                            id='mobile.channel_header.info'
                            defaultMessage='Info'
                        />
                    </TouchableOpacity>
                </Animatable.View>
                }
            </React.Fragment>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        header: {
            backgroundColor: theme.sidebarHeaderBg,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            width: '100%',
            zIndex: 10,
        },
        optionContainer: {
            width: 60,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
        },
        optionText: {
            fontSize: 11,
            color: theme.sidebarHeaderTextColor,
            marginLeft: 2,
            marginTop: 2,
        },
        optionImage: {
            width: 26,
            height: 26,
            tintColor: theme.sidebarHeaderTextColor,
        },
        options: {
            position: 'absolute',
            paddingHorizontal: 30,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            top: DeviceTypes.IS_IPHONE_WITH_INSETS ? 88 : 64,
            width: '100%',
            height: 60,
            backgroundColor: theme.sidebarHeaderBg,
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderBottomWidth: 1,
            zIndex: 9,
        },
        badge: {
            backgroundColor: theme.sidebarHeaderTextColor,
            padding: 3,
            position: 'relative',
            height: 18,
        },
        badgeContainer: {
            borderColor: theme.sidebarHeaderTextColor,
            borderRadius: 9,
            borderWidth: 0,
            right: 8,
            top: -5,
        },
        mention: {
            color: theme.sidebarHeaderBg,
            fontSize: 10,
        },
    };
});
