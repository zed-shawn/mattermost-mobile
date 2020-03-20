// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getConfig} from 'app/realm';

export const writePosts = async (posts) => {
    Realm.open(getConfig()).then((realm) => {
        realm.write(() => {
            Object.values(posts).forEach((post) => {
                const properties = buildPostProperties(post);
                try {
                    realm.create('Post', properties, true);
                } catch (error) {
                    console.log('WRITE ERROR', error); // eslint-disable-line no-console
                }
            });
        });
    });
};

const buildPostProperties = (post) => {
    let properties = {...post};
    if (Object.keys(properties.metadata).length) {
        const metadata = {
            ...properties.metadata,
            images: parseMetadataImages(properties.metadata.images),
            embeds: parseMetadataEmbeds(properties.metadata.embeds),
            reactions: parseMetadataReactions(properties.metadata.reactions),
        };
        properties = {
            ...properties,
            metadata,
        };
    }

    if (!Object.keys(properties.props).length) {
        delete properties.props;
    }

    return properties;
};

const parseMetadataImages = (images = []) => {
    if (!Array.isArray(images)) {
        return Object.keys(images).map((url) => ({
            url,
            ...images[url],
        }));
    }

    return images;
};

const parseMetadataEmbeds = (embeds = []) => {
    const parsedEmbeds = [];
    for (let i = 0; i < embeds.length; i++) {
        if (embeds[i]) {
            let embed = {...embeds[i]};

            if (embed.data) {
                const images = intoArray(embed.data.images);
                const audios = intoArray(embed.data.audios);
                const videos = intoArray(embed.data.videos);

                embed = {
                    ...embed,
                    data: {
                        ...embed.data,
                        images,
                        audios,
                        videos,
                    },
                };
            }

            parsedEmbeds.push(embed);
        }
    }

    return parsedEmbeds;
};

const parseMetadataReactions = (reactions) => {
    return intoArray(reactions);
};

const intoArray = (value) => {
    let arr = value || [];
    if (!Array.isArray(arr)) {
        return Object.values(arr);
    }

    return arr;
}
