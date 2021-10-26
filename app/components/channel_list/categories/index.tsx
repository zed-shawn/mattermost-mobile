// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FlatList, View} from 'react-native';

import ThreadsButton from '../threads';

import CategoryBody from './body';
import CategoryHeader from './header';

type Props = {
    categories: TempoCategory[];
}

const renderCategory = (data: {item: TempoCategory}) => (
    <View>
        <CategoryHeader heading={data.item.title}/>
        <CategoryBody channels={data.item.channels}/>
    </View>
);

const Categories = (props: Props) => {
    return (
        <FlatList
            data={props.categories}
            renderItem={renderCategory}
            ListHeaderComponent={ThreadsButton}
            style={{flex: 1}}
        />
    );
};

export default Categories;
