import React from "react";
import {combineReducers} from "redux";
import {persistReducer} from "redux-persist";
import storage from "redux-persist/lib/storage";

import {notification} from "antd";
import "antd/es/notification/style/css";

import {auth} from "./modules/auth/reducers";
import {containerKinds, containers} from "./modules/containers/reducers";
import {individuals} from "./modules/individuals/reducers";
import {query} from "./modules/query/reducers";
import {samples} from "./modules/samples/reducers";
import {users} from "./modules/users/reducers";
import {versions} from "./modules/versions/reducers";

const AUTH_PERSIST_CONFIG = {
    key: "auth",
    blacklist: ["isFetching"],
    storage,
};

const allReducers = combineReducers({
    auth: persistReducer(AUTH_PERSIST_CONFIG, auth),
    containerKinds,
    containers,
    individuals,
    query,
    samples,
    users,
    versions,
});

function errorReducer(state, action) {
    if (action.error) {
        notification.error({
            message: 'An error occured',
            description:
                <pre style={{ fontSize: '0.8em' }}>
                    {action.error.message}
                    {action.error.stack}
                </pre>,
            duration: 0,
        });
    }
    return allReducers(state, action);
}

const rootReducer = errorReducer;

export default rootReducer;
