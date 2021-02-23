import React from "react";
import {combineReducers} from "redux";
import {persistReducer} from "redux-persist";
import storage from "redux-persist/lib/storage";
import {notification} from "antd";

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
import {reducer as groups} from "./modules/groups";
import shouldIgnoreError from "./utils/shouldIgnoreError";

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
  groups,
  versions,
});

function errorReducer(state, action) {
  showError(action)
  return allReducers(state, action);
}

function showError(action) {
  if (!action.error)
    return

  if (shouldIgnoreError(action))
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
