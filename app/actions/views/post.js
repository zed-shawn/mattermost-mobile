// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Posts} from 'mattermost-redux/constants';
import {createPost, doPostAction, receivedNewPost} from 'mattermost-redux/actions/posts';
import {makeGetFilesForPost} from 'mattermost-redux/selectors/entities/files';

import {ViewTypes} from 'app/constants';
import {generateId} from 'app/utils/file';

import {retryVoiceMessage} from './voice';

export function sendAddToChannelEphemeralPost(user, addedUsername, message, channelId, postRootId = '') {
    return async (dispatch) => {
        const timestamp = Date.now();
        const post = {
            id: generateId(),
            user_id: user.id,
            channel_id: channelId,
            message,
            type: Posts.POST_TYPES.EPHEMERAL_ADD_TO_CHANNEL,
            create_at: timestamp,
            update_at: timestamp,
            root_id: postRootId,
            parent_id: postRootId,
            props: {
                username: user.username,
                addedUsername,
            },
        };

        dispatch(receivedNewPost(post));
    };
}

export function setAutocompleteSelector(dataSource, onSelect, options) {
    return {
        type: ViewTypes.SELECTED_ACTION_MENU,
        data: {
            dataSource,
            onSelect,
            options,
        },
    };
}

export function selectAttachmentMenuAction(postId, actionId, text, value) {
    return (dispatch) => {
        dispatch({
            type: ViewTypes.SUBMIT_ATTACHMENT_MENU_ACTION,
            postId,
            data: {
                [actionId]: {
                    text,
                    value,
                },
            },
        });

        dispatch(doPostAction(postId, actionId, value));
    };
}

export function retryFailedPost(post) {
    const getFilesForPost = makeGetFilesForPost();
    return async (dispatch, getState) => {
        if (post.file_ids?.length) {
            const state = getState();
            const files = getFilesForPost(state, post.pending_post_id);
            const isVoiceMessage = files?.some((f) => f.name.startsWith('voice-message'));
            if (isVoiceMessage) {
                return dispatch(retryVoiceMessage(files[0], post));
            }
        }

        return dispatch(createPost(post));
    };
}