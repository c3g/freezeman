import React from "react";
import {combineReducers} from "redux";
import {persistReducer} from "redux-persist";
import storage from "redux-persist/lib/storage";

import {notification} from "antd";
import "antd/es/notification/style/css";

import {auth} from "./modules/auth/reducers";
import {
  containerKinds,
  containersSummary,
  containerTemplateActions,
  containers,
} from "./modules/containers/reducers";
import {individuals} from "./modules/individuals/reducers";
import {query} from "./modules/query/reducers";
import {
  samplesSummary,
  sampleTemplateActions,
  samples,
} from "./modules/samples/reducers";
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
  containersSummary,
  containerTemplateActions,
  containers,
  individuals,
  query,
  samplesSummary,
  sampleTemplateActions,
  samples,
  users,
  versions,
});

function errorReducer(state, action) {
  showError(action)
  return allReducers(state, action);
}

function showError(action) {
  if (!action.error)
    return

  const ignoreError = action?.meta?.ignoreError

  if (ignoreError === true)
    return

  if (typeof ignoreError === 'string' && ignoreError === action.error.name)
    return

  if (Array.isArray(ignoreError) && ignoreError.some(e => e === action.error.name))
    return

  if (typeof ignoreError === 'function' && ignoreError(action.error, action))
    return

  notification.error({
    message: 'An error occurred',
    description:
      <pre style={{fontSize: '0.8em', whiteSpace: 'pre-wrap'}}>
        {action.error.message}
        {action.error.stack}
      </pre>,
    duration: 0,
  });
}

const rootReducer = errorReducer;

export default rootReducer;
