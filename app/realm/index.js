// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Realm from 'realm';

import {Client4} from 'mattermost-redux/client';

import {
    PostSchema,
    PostPropsSchema,
    PostMetadataSchema,
    PostMetadataFileSchema,
    PostMetadataImageSchema,
    PostMetadataEmojiSchema,
    PostMetadataReactionSchema,
    PostMetadataEmbedSchema,
    PostMetadataEmbedDataSchema,
    PostMetadataEmbedDataImageSchema,
    PostMetadataEmbedDataAudioSchema,
    PostMetadataEmbedDataVideoSchema,
} from 'app/realm/schemas/post';

const postSchemas = [
    PostSchema,
    PostPropsSchema,
    PostMetadataSchema,
    PostMetadataFileSchema,
    PostMetadataImageSchema,
    PostMetadataEmojiSchema,
    PostMetadataReactionSchema,
    PostMetadataEmbedSchema,
    PostMetadataEmbedDataSchema,
    PostMetadataEmbedDataImageSchema,
    PostMetadataEmbedDataAudioSchema,
    PostMetadataEmbedDataVideoSchema,
];

const hash = (s) => {
    return Math.abs(s.split('').reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0));
};

export const getConfig = () => {
        const serverUrl = Client4.url;
        const userId = Client4.userId;
        const dbName = hash(serverUrl.trim() + userId.trim());

        return {
            path: `${dbName}.realm`,
            schema: postSchemas,
        };
};
