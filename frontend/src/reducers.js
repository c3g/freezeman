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
import {
  sampleKinds,
  samplesSummary,
  sampleTemplateActions,
  samples,
} from "./modules/samples/reducers";
import {
  processesSummary,
  processTemplateActions,
  processes,
} from "./modules/processes/reducers";
import {
  protocols,
} from "./modules/protocols/reducers";
import {users} from "./modules/users/reducers";
import {versions} from "./modules/versions/reducers";
import {reducer as groups} from "./modules/groups";
import {logOut} from "./modules/auth/actions";
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
  sampleKinds,
  samplesSummary,
  sampleTemplateActions,
  samples,
  protocols,
  processesSummary,
  processTemplateActions,
  processes,
  users,
  groups,
  versions,
});

function errorReducer(state, action) {
  const otherAction = showError(action);
  const newState = allReducers(state, action);
  if (otherAction)
    return allReducers(newState, otherAction);
  return newState;
}

function showError(action) {
  if (!action.error)
    return

  if (action.error.message.includes('Given token not valid for any token type'))
    return logOut()

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
