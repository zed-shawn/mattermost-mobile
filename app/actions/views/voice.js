// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {batchActions} from 'redux-batched-actions';
import RNFetchBlob from 'rn-fetch-blob';

import {FileTypes, PostTypes} from 'mattermost-redux/action_types';
import {receivedPost, removePost} from 'mattermost-redux/actions/posts';
import {Client4} from 'mattermost-redux/client';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';

import mattermostBucket from 'app/mattermost_bucket';
import {buildFileUploadData, encodeHeaderURIStringToUTF8, generateId} from 'app/utils/file';

export function createVoiceMessage(localPath, rootId) {
    return async (dispatch, getState) => {
        const state = getState();
        const currentChannelId = getCurrentChannelId(state);
        const currentUserId = getCurrentUserId(state);
        const timestamp = Date.now();
        const pendingPostId = `${currentUserId}:${timestamp}`;
        const path = localPath.replace('file://', '');
        const fileStats = await RNFetchBlob.fs.stat(path);
        const clientId = generateId();
        const fileData = buildFileUploadData({name: fileStats.filename});
        const tempFile = {
            id: clientId,
            clientId,
            user_id: currentChannelId,
            post_id: pendingPostId,
            create_at: timestamp,
            update_at: timestamp,
            delete_at: 0,
            name: fileStats.filename,
            localPath,
            size: fileStats.size,
            mime_type: fileData.type,
            has_preview_image: false,
        };
        const tempPost = {
            id: pendingPostId,
            user_id: currentUserId,
            channel_id: currentChannelId,
            root_id: rootId,
            parent_id: rootId,
            pending_post_id: pendingPostId,
            create_at: timestamp,
            update_at: timestamp,
        };

        dispatch({
            type: PostTypes.RECEIVED_NEW_POST,
            data: {
                ...tempPost,
                file_ids: [clientId],
                metadata: {
                    files: [tempFile],
                },
            },
        });

        return dispatch(doCreateVoiceMessage(tempFile, tempPost));
    };
}

export function retryVoiceMessage(file, post) {
    return async (dispatch) => {
        if (file.failed) {
            return dispatch(doCreateVoiceMessage(file, post));
        }

        return dispatch(doPostVoiceMessage(file, post));
    };
}

function doCreateVoiceMessage(tempFile, tempPost) {
    return async (dispatch) => {
        const {clientId, localPath} = tempFile;
        const file = {
            clientId,
            uri: localPath,
            localPath,
            fileSize: tempFile.size,
            fileName: tempFile.name,
        };
        const upload = await uploadVoiceMessage(file, tempPost);
        if (upload?.error) {
            // dispatch to handle error
            dispatch(voiceMessageFailed(tempFile, tempPost));
            return upload;
        }

        const voiceMessage = {
            ...tempFile,
            id: upload.data[0].id,
        };
        return dispatch(doPostVoiceMessage(voiceMessage, tempPost));
    };
}

function doPostVoiceMessage(tempFile, tempPost) {
    return async (dispatch) => {
        // Create the post now
        let post;
        try {
            post = await Client4.createPost({
                ...tempPost,
                id: null,
                create_at: 0,
                file_ids: [tempFile.id],
            });
        } catch (error) {
            dispatch(voiceMessagePostFailed(tempFile, tempPost, error));
            return {error};
        }

        // delete the metadata as we already have it
        Reflect.deleteProperty(post, 'metadata');

        dispatch(batchActions([
            receivedPost(post),
            {
                type: FileTypes.UPDATE_FILES_FOR_POST,
                data: {
                    clientId: tempFile.clientId,
                    id: tempFile.id,
                    postId: post.id,
                    pendingPostId: tempPost.pending_post_id,
                },
            },
        ]));

        return {data: post};
    };
}

async function uploadVoiceMessage(file, post) {
    const fileData = buildFileUploadData(file);

    const headers = {
        Authorization: `Bearer ${Client4.getToken()}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'multipart/form-data',
        'X-CSRF-Token': Client4.csrf,
    };

    const fileInfo = {
        name: 'files',
        filename: encodeHeaderURIStringToUTF8(fileData.name),
        data: RNFetchBlob.wrap(file.localPath.replace('file://', '')),
        type: fileData.type,
    };

    const data = [
        {name: 'channel_id', data: post.channel_id},
        {name: 'client_ids', data: file.clientId},
        fileInfo,
    ];

    Client4.trackEvent('api', 'api_files_upload');

    const certificate = await mattermostBucket.getPreference('cert');
    const options = {
        timeout: 10000,
        certificate,
    };

    try {
        const res = await RNFetchBlob.config(options).fetch('POST', Client4.getFilesRoute(), headers, data);
        const response = JSON.parse(res.data);

        if (res.respInfo.status === 200 || res.respInfo.status === 201) {
            const fileInfos = response.file_infos.map((f) => {
                return {
                    ...f,
                    clientId: file.clientId,
                };
            });

            return {data: fileInfos};
        }

        return {error: response.message};
    } catch (error) {
        return {error};
    }
}

function voiceMessageFailed(tempFile, tempPost) {
    return (dispatch) => {
        dispatch(batchActions([
            receivedPost({
                ...tempPost,
                failed: true,
                file_ids: [tempFile.clientId],
                metadata: {
                    files: [tempFile],
                },
                update_at: Date.now(),
            }), {
                type: FileTypes.UPLOAD_FILES_FAILURE,
                clientIds: [tempFile.id],
            },
        ]));
    };
}

function voiceMessagePostFailed(tempFile, tempPost, error) {
    return async (dispatch) => {
        const failedPost = {
            ...tempPost,
            failed: true,
            file_ids: [tempFile.clientId],
            metadata: {
                files: [tempFile],
            },
            update_at: Date.now(),
        };

        if (error.server_error_id === 'api.post.create_post.root_id.app_error' ||
            error.server_error_id === 'api.post.create_post.town_square_read_only' ||
            error.server_error_id === 'plugin.message_will_be_posted.dismiss_post'
        ) {
            dispatch(removePost(failedPost));
            return {error, remove: true};
        }

        dispatch(receivedPost(failedPost));

        return {error};
    };
}
