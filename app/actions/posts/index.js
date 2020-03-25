// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as PostActions from 'mattermost-redux/actions/posts';

import {Client4} from 'mattermost-redux/client';
import {Posts} from 'mattermost-redux/constants';
import {PostTypes, UserTypes, ChannelTypes, FileTypes} from 'mattermost-redux/action_types';
import {batchActions} from 'mattermost-redux/types/actions';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/common';
import {isPostIdSending} from 'mattermost-redux/selectors/entities/posts';
import {removeUserFromList} from 'mattermost-redux/utils/user_utils';

import {getEmojisInPosts} from 'app/actions/views/emoji';
import {writePosts} from 'app/realm/writers/post';

PostActions.getPost = (postId) => {
    return async (dispatch, getState) => {
        let post;
        try {
            post = await Client4.getPost(postId);
        } catch (error) {
            return {error};
        }

        if (post) {
            writePosts([newPost]);

            const state = getState();
            const currentChannelId = getCurrentChannelId(state);

            if (post.channel_id === currentChannelId) {
                dispatch(batchActions([
                    PostActions.receivedPost(post),
                    {
                        type: PostTypes.GET_POSTS_SUCCESS,
                    },
                ]));
            }
        }

        return {data: post};
    };
};

PostActions.createPost = (post, files) => {
    return async (dispatch, getState) => {
        const state = getState();
        const currentUserId = state.entities.users.currentUserId;

        const timestamp = Date.now();
        const pendingPostId = post.pending_post_id || `${currentUserId}:${timestamp}`;

        if (isPostIdSending(state, pendingPostId)) {
            return {data: true};
        }

        let newPost = {
            ...post,
            pending_post_id: pendingPostId,
            create_at: timestamp,
            update_at: timestamp,
        };

        writePosts([newPost]);

        // We are retrying a pending post that had files
        if (newPost.file_ids && !files?.length) {
            files = newPost.file_ids.map((id) => state.entities.files.files[id]); // eslint-disable-line
        }

        if (files?.length) {
            const fileIds = files.map((file) => file.id);

            newPost = {
                ...newPost,
                file_ids: fileIds,
            };

            dispatch({
                type: FileTypes.RECEIVED_FILES_FOR_POST,
                postId: pendingPostId,
                data: files,
            });
        }

        const currentChannelId = getCurrentChannelId(state);
        if (post.channel_id === currentChannelId) {
            dispatch({
                type: PostTypes.RECEIVED_NEW_POST,
                data: {
                    id: pendingPostId,
                    ...newPost,
                },
                meta: {
                    offline: {
                        effect: () => Client4.createPost({...newPost, create_at: 0}),
                        commit: (result, payload) => {
                            const actions = [
                                PostActions.receivedPost(payload),
                                {
                                    type: PostTypes.CREATE_POST_SUCCESS,
                                },
                                {
                                    type: ChannelTypes.INCREMENT_TOTAL_MSG_COUNT,
                                    data: {
                                        channelId: newPost.channel_id,
                                        amount: 1,
                                    },
                                },
                                {
                                    type: ChannelTypes.DECREMENT_UNREAD_MSG_COUNT,
                                    data: {
                                        channelId: newPost.channel_id,
                                        amount: 1,
                                    },
                                },
                            ];

                            if (files) {
                                actions.push({
                                    type: FileTypes.RECEIVED_FILES_FOR_POST,
                                    postId: payload.id,
                                    data: files,
                                });
                            }

                            dispatch(batchActions(actions));
                        },
                        maxRetry: 0,
                        offlineRollback: true,
                        rollback: (result, error) => {
                            const data = {
                                ...newPost,
                                id: pendingPostId,
                                failed: true,
                                update_at: Date.now(),
                            };
                            dispatch({type: PostTypes.CREATE_POST_FAILURE, error});

                            // If the failure was because: the root post was deleted or
                            // TownSquareIsReadOnly=true then remove the post
                            if (error.server_error_id === 'api.post.create_post.root_id.app_error' ||
                                error.server_error_id === 'api.post.create_post.town_square_read_only' ||
                                error.server_error_id === 'plugin.message_will_be_posted.dismiss_post'
                            ) {
                                dispatch(PostActions.removePost(data));
                            } else {
                                dispatch(PostActions.receivedPost(data));
                            }
                        },
                    },
                },
            });
        }

        return {data: true};
    };
};

PostActions.getPosts = (channelId, page = 0, perPage = Posts.POST_CHUNK_SIZE) => {
    return async (dispatch, getState) => {
        let data;
        try {
            data = await Client4.getPosts(channelId, page, perPage);
        } catch (error) {
            return {error};
        }

        const posts = Object.values(data.posts);
        if (posts.length) {
            writePosts(posts);

            const state = getState();
            const currentChannelId = getCurrentChannelId(state);

            if (channelId === currentChannelId) {
                const actions = [
                    PostActions.receivedPosts(data),
                    PostActions.receivedPostsInChannel(data, channelId, page === 0, data.prev_post_id === ''),
                ];

                const additional = await dispatch(getPostsAdditionalDataBatch(posts));
                if (additional.length) {
                    actions.push(...additional);
                }

                dispatch(batchActions(actions));
            }
        }

        return {data};
    };
};

PostActions.getPostsSince = (channelId, since) => {
    return async (dispatch, getState) => {
        let data;
        try {
            data = await Client4.getPostsSince(channelId, since);
        } catch (error) {
            return {error};
        }

        const posts = Object.values(data.posts);
        if (posts.length) {
            writePosts(posts);

            const state = getState();
            const currentChannelId = getCurrentChannelId(state);

            if (channelId === currentChannelId) {
                const actions = [
                    PostActions.receivedPosts(data),
                    PostActions.receivedPostsSince(data, channelId),
                ];

                const additional = await dispatch(getPostsAdditionalDataBatch(posts));
                if (additional.length) {
                    actions.push(...additional);
                }

                dispatch(batchActions(actions));
            }
        }

        return {data};
    };
};

PostActions.getPostsBefore = (channelId, postId, page = 0, perPage = Posts.POST_CHUNK_SIZE) => {
    return async (dispatch, getState) => {
        let data;
        try {
            data = await Client4.getPostsBefore(channelId, postId, page, perPage);
        } catch (error) {
            return {error};
        }

        const posts = Object.values(data.posts);
        if (posts.length) {
            writePosts(posts);

            const state = getState();
            const currentChannelId = getCurrentChannelId(state);

            if (channelId === currentChannelId) {
                const actions = [
                    PostActions.receivedPosts(data),
                    PostActions.receivedPostsBefore(data, channelId, postId, data.prev_post_id === ''),
                ];

                const additional = await dispatch(getPostsAdditionalDataBatch(posts));
                if (additional.length) {
                    actions.push(...additional);
                }

                dispatch(batchActions(actions));
            }
        }

        return {data};
    };
};

PostActions.getPostsAfter = (channelId, postId, page = 0, perPage = Posts.POST_CHUNK_SIZE) => {
    return async (dispatch, getState) => {
        let data;
        try {
            data = await Client4.getPostsBefore(channelId, postId, page, perPage);
        } catch (error) {
            return {error};
        }

        const posts = Object.values(data.posts);
        if (posts.length) {
            writePosts(posts);

            const state = getState();
            const currentChannelId = getCurrentChannelId(state);

            if (channelId === currentChannelId) {
                const actions = [
                    PostActions.receivedPosts(data),
                    PostActions.receivedPostsAfter(data, channelId, postId, data.next_post_id === ''),
                ];

                const additional = await dispatch(getPostsAdditionalDataBatch(posts));
                if (additional.length) {
                    actions.push(...additional);
                }

                dispatch(batchActions(actions));
            }
        }

        return {data};
    };
}

PostActions.getPostsAround = (channelId, postId, perPage = Posts.POST_CHUNK_SIZE / 2) => {
    return async (dispatch, getState) => {
        let data;
        let before;
        let thread;
        let after;
        try {
            [before, thread, after] = await Promise.all([
                Client4.getPostsBefore(channelId, postId, 0, perPage),
                Client4.getPostThread(postId),
                Client4.getPostsAfter(channelId, postId, 0, perPage),
            ]);

            data = {
                posts: {
                    ...after.posts,
                    ...thread.posts,
                    ...before.posts,
                },
                order: [
                    ...after.order,
                    postId,
                    ...before.order,
                ],
                next_post_id: after.next_post_id,
                prev_post_id: before.prev_post_id,
            };
        } catch (error) {
            return {error};
        }

        const posts = Object.values(data.posts);
        if (posts.length) {
            writePosts(posts);

            const state = getState();
            const currentChannelId = getCurrentChannelId(state);

            if (channelId === currentChannelId) {
                const actions = [
                    PostActions.receivedPosts(data),
                    PostActions.receivedPostsInChannel(data, channelId, after.next_post_id === '', before.prev_post_id === ''),
                ];

                const additional = await dispatch(getPostsAdditionalDataBatch(posts));
                if (additional.length) {
                    actions.push(...additional);
                }

                dispatch(batchActions(actions));
            }
        }

        return {data};
    };
};

PostActions.getPostThread = (rootId) => {
    return async (dispatch, getState) => {
        let data;
        try {
            data = await Client4.getPostThread(rootId);
        } catch (error) {
            return {error};
        }

        const posts = Object.values(data.posts);
        if (posts.length) {
            writePosts(posts);

            const state = getState();
            const currentChannelId = getCurrentChannelId(state);
            const channelId = posts[0].channel_id;

            if (channelId === currentChannelId) {
                const actions = [
                    PostActions.receivedPosts(data),
                    PostActions.receivedPostsInThread(data, rootId),
                ];

                const additional = await dispatch(getPostsAdditionalDataBatch(posts));
                if (additional.length) {
                    actions.push(...additional);
                }

                dispatch(batchActions(actions));
            }
        }

        return {data};
    };
};

PostActions.receivedPostsSinceSuccess = () => {
    return {
        type: PostTypes.GET_POSTS_SINCE_SUCCESS,
    };
};

function getPostsAdditionalDataBatch(posts = []) {
    return async (dispatch, getState) => {
        const actions = [];

        if (!posts.length) {
            return actions;
        }

        // Custom Emojis used in the posts
        // Do not wait for this as they need to be loaded one by one
        dispatch(getEmojisInPosts(posts));

        try {
            const state = getState();
            const promises = [];
            const promiseTrace = [];
            const extra = dispatch(profilesStatusesAndToLoadFromPosts(posts));

            if (extra?.userIds.length) {
                promises.push(Client4.getProfilesByIds(extra.userIds));
                promiseTrace.push('ids');
            }

            if (extra?.usernames.length) {
                promises.push(Client4.getProfilesByUsernames(extra.usernames));
                promiseTrace.push('usernames');
            }

            if (extra?.statuses.length) {
                promises.push(Client4.getStatusesByIds(extra.statuses));
                promiseTrace.push('statuses');
            }

            if (promises.length) {
                const result = await Promise.all(promises);
                result.forEach((p, index) => {
                    if (p.length) {
                        const type = promiseTrace[index];
                        switch (type) {
                        case 'statuses':
                            actions.push({
                                type: UserTypes.RECEIVED_STATUSES,
                                data: p,
                            });
                            break;
                        default: {
                            const {currentUserId} = state.entities.users;

                            removeUserFromList(currentUserId, p);
                            actions.push({
                                type: UserTypes.RECEIVED_PROFILES_LIST,
                                data: p,
                            });
                            break;
                        }
                        }
                    }
                });
            }
        } catch (error) {
            // do nothing
        }

        return actions;
    };
}

function profilesStatusesAndToLoadFromPosts(posts = []) {
    return (dispatch, getState) => {
        const state = getState();
        const {currentUserId, profiles, statuses} = state.entities.users;

        // Profiles of users mentioned in the posts
        const usernamesToLoad = PostActions.getNeededAtMentionedUsernames(state, posts);

        // Statuses and profiles of the users who made the posts
        const userIdsToLoad = new Set();
        const statusesToLoad = new Set();

        posts.forEach((post) => {
            const userId = post.user_id;

            if (!statuses[userId]) {
                statusesToLoad.add(userId);
            }

            if (userId === currentUserId) {
                return;
            }

            if (!profiles[userId]) {
                userIdsToLoad.add(userId);
            }
        });

        return {
            usernames: Array.from(usernamesToLoad),
            userIds: Array.from(userIdsToLoad),
            statuses: Array.from(statusesToLoad),
        };
    };
}

export * from 'mattermost-redux/actions/posts'; // eslint-disable-line no-duplicate-imports