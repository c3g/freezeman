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
  containerPrefillTemplates,
  containers,
} from "./modules/containers/reducers";
import {individuals} from "./modules/individuals/reducers";
import {
  sampleKinds,
  samplesSummary,
  sampleTemplateActions,
  samplePrefillTemplates,
  samples,
} from "./modules/samples/reducers";
import {
  processMeasurementsSummary,
  processMeasurementTemplateActions,
  processMeasurements,
} from "./modules/processMeasurements/reducers";
import {
  protocols,
} from "./modules/protocols/reducers";
import {
  runTypes,
  experimentRuns,
  instruments,
  processes,
  propertyValues,
  experimentRunTemplateActions,
} from "./modules/experimentRuns/reducers";
import {
  projectsSummary,
  projects,
  projectTemplateActions
} from "./modules/projects/reducers";
import {
  indicesSummary,
  indices,
  indicesTemplateActions
} from "./modules/indices/reducers";
import {
  sequences,
} from "./modules/sequences/reducers";
import {
  librariesSummary,
  libraries,
  librariesTemplateActions
} from "./modules/libraries/reducers";
import {
  libraryTypes,
} from "./modules/libraryTypes/reducers";
import {
  platforms,
} from "./modules/platforms/reducers";
import {users} from "./modules/users/reducers";
import {versions} from "./modules/versions/reducers";
import {reducer as groups} from "./modules/groups";
import {reducer as pagination} from "./modules/pagination";
import {logOut} from "./modules/auth/actions";
import shouldIgnoreError from "./utils/shouldIgnoreError";

const AUTH_PERSIST_CONFIG = {
  key: "auth",
  blacklist: ["isFetching"],
  storage,
};

const TOKEN_EXPIRED_MESSAGE = 'Given token not valid for any token type'

const recentMessages = new Set();

const allReducers = combineReducers({
  auth: persistReducer(AUTH_PERSIST_CONFIG, auth),
  containerKinds,
  containersSummary,
  containerTemplateActions,
  containerPrefillTemplates,
  containers,
  experimentRuns,
  experimentRunTemplateActions,
  runTypes,
  individuals,
  instruments,
  sampleKinds,
  samplesSummary,
  sampleTemplateActions,
  samplePrefillTemplates,
  samples,
  protocols,
  processes,
  processMeasurementsSummary,
  processMeasurementTemplateActions,
  processMeasurements,
  projectsSummary,
  projects,
  projectTemplateActions,
  indicesSummary,
  indices,
  indicesTemplateActions,
  propertyValues,
  sequences,
  librariesSummary,
  libraries,
  librariesTemplateActions,
  libraryTypes,
  platforms,
  users,
  groups,
  pagination,
  versions,
});

export default function rootReducer(state, action) {
  const otherAction = getErrorAction(action);
  const newState = allReducers(state, action);
  if (otherAction)
    return allReducers(newState, otherAction);
  return newState;
}

function getErrorAction(action) {
  if (!action.error)
    return

  if (action.error.message.includes(TOKEN_EXPIRED_MESSAGE)) {
    showNotification('Your session expired. Login again to continue.', undefined, 'warning')
    return logOut()
  }

  if (shouldIgnoreError(action))
    return

  const error = getErrorDescription(action.error)
  showNotification(error.message, error.details)
}

function showNotification(message, details, type = 'error') {
  if (recentMessages.has(message))
    return;

  recentMessages.add(message)
  setTimeout(() => { recentMessages.delete(message) }, 5 * 1000);

  notification[type]({
    message,
    description:
      <pre style={{fontSize: '0.8em', whiteSpace: 'pre-wrap'}}>
        {details}
      </pre>,
    duration: 0,
  });
}

function getErrorDescription(error) {
  /* HTTP errors are handled specially because they include the URL
   * in the error message and we don't want many very similar errors
   * to show up, just show one.
   */
  if (typeof error.status === 'number')
    return {
      message: `HTTP Error ${error.status}: ${error.statusText}`,
      details: error.url,
    }

  return {
    message: error.message,
    details: error.stack,
  }
}
