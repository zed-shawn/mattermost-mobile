// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import { dismissModal } from '@actions/navigation';
import SlideUpPanel from '@components/slide_up_panel';

const Servers = (props: any) => {
    return (
        <View style={{flex: 1}}>
            <SlideUpPanel
                onRequestClose={dismissModal}
                initialPosition={0.55}
                // header={this.renderHeader}
                headerHeight={37.5}
                // key={`landscape-${isLandscape}`}
                theme={props.theme}
            >
                <View><Text>Your Servers</Text></View>
            </SlideUpPanel>
        </View>
    )
}

export default Servers;