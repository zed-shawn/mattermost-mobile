// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import DatabaseProvider from '@nozbe/watermelondb/DatabaseProvider';
import React, {ComponentType, useEffect, useState} from 'react';

import ServerDisplayNameProvider from '@app/context/server_display_name';
import {MM_TABLES} from '@constants/database';
import ServerUrlProvider from '@context/server_url';
import ThemeProvider from '@context/theme';
import UserLocaleProvider from '@context/user_locale';
import DatabaseManager from '@database/manager';

import type ServersModel from '@typings/database/models/app/servers';

type State = {
    database: Database;
    serverDisplayName: string;
    serverUrl: string;
};

const {SERVERS} = MM_TABLES.APP;

export function withServerDatabase<T>(Component: ComponentType<T>): ComponentType<T> {
    return function ServerDatabaseComponent(props) {
        const [state, setState] = useState<State | undefined>();
        const db = DatabaseManager.appDatabase?.database;

        const observer = (servers: ServersModel[]) => {
            const server = servers?.length ? servers.reduce((a, b) =>
                (b.lastActiveAt > a.lastActiveAt ? b : a),
            ) : undefined;

            if (server) {
                const serverDatabase =
                    DatabaseManager.serverDatabases[server?.url]?.database;

                setState({
                    database: serverDatabase,
                    serverUrl: server?.url,
                    serverDisplayName: server?.displayName,
                });
            } else {
                setState(undefined);
            }
        };

        useEffect(() => {
            const subscription = db?.collections.
                get(SERVERS).
                query(Q.where('identifier', Q.notEq(''))).
                observeWithColumns(['last_active_at']).
                subscribe(observer);

            return () => {
                subscription?.unsubscribe();
            };
        }, []);

        if (!state?.database) {
            return null;
        }

        return (
            <DatabaseProvider database={state.database}>
                <UserLocaleProvider database={state.database}>
                    <ServerDisplayNameProvider displayName={state.serverDisplayName}>
                        <ServerUrlProvider url={state.serverUrl}>
                            <ThemeProvider database={state.database}>
                                <Component {...props}/>
                            </ThemeProvider>
                        </ServerUrlProvider>
                    </ServerDisplayNameProvider>
                </UserLocaleProvider>
            </DatabaseProvider>
        );
    };
}
