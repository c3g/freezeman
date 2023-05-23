import React from "react";
import {combineReducers} from "redux";
import {persistReducer} from "redux-persist";
import storage from "redux-persist/lib/storage";
import {notification} from "antd";

import {auth} from "./modules/auth/reducers";
import { app } from "./modules/app/reducers";
import {
  containerKinds,
  containersSummary,
  containerTemplateActions,
  containerPrefillTemplates,
  containers,
} from "./modules/containers/reducers";
import {datasets} from "./modules/datasets/reducers";
import {datasetFiles} from "./modules/datasetFiles/reducers";
import {taxons} from "./modules/taxons/reducers";
import {referenceGenomes} from './modules/referenceGenomes/reducers'
import {individuals} from "./modules/individuals/reducers";
import {
  sampleKinds,
  samplesSummary,
  sampleTemplateActions,
  samplePrefillTemplates,
  samples,
} from "./modules/samples/reducers";
import {
  pooledSamples
} from "./modules/pooledSamples/reducers"
import {
  processes
} from "./modules/processes/reducers"
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
  propertyValues,
  experimentRunTemplateActions,
  experimentRunLaunches
} from "./modules/experimentRuns/reducers";
import {
  externalExperimentRuns
} from "./modules/experimentRuns/externalExperimentsReducers"
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
  libraryTemplateActions,
  libraryPrefillTemplates
} from "./modules/libraries/reducers";
import {
  libraryTypes,
} from "./modules/libraryTypes/reducers";
import {
  platforms,
} from "./modules/platforms/reducers";
import {
  importedFiles,
} from "./modules/importedFiles/reducers";
import {users} from "./modules/users/reducers";
import {versions} from "./modules/versions/reducers";
import { workflows } from "./modules/workflows/reducers";
import {reducer as groups} from "./modules/groups";
import {reducer as pagination} from "./modules/pagination";
import {logOut} from "./modules/auth/actions";
import shouldIgnoreError from "./utils/shouldIgnoreError";
import { studies } from "./modules/studies/reducers";
import { labworkSummary } from "./modules/labwork/reducers";
import { studySamples } from "./modules/studySamples/reducers";
import {coordinates} from "./modules/coordinates/reducers"
import { labworkSteps, sampleNextStepTemplateActions } from "./modules/labworkSteps/reducers";
import { steps } from './modules/steps/reducers'

const AUTH_PERSIST_CONFIG = {
  key: "auth",
  blacklist: ["isFetching"],
  storage,
};

const TOKEN_EXPIRED_MESSAGE = 'Given token not valid for any token type'

const recentMessages = new Set();

const allReducers = combineReducers({
  auth: persistReducer(AUTH_PERSIST_CONFIG, auth),
  app,
  containerKinds,
  containersSummary,
  containerTemplateActions,
  containerPrefillTemplates,
  containers,
  datasets,
  datasetFiles,
  experimentRuns,
  externalExperimentRuns,
  experimentRunLaunches,
  experimentRunTemplateActions,
  runTypes,
  individuals,
  taxons,
  referenceGenomes,
  instruments,
  sampleKinds,
  samplesSummary,
  sampleTemplateActions,
  samplePrefillTemplates,
  samples,
  pooledSamples,
  protocols,
  processes,
  processMeasurementsSummary,
  processMeasurementTemplateActions,
  processMeasurements,
  projectsSummary,
  projects,
  projectTemplateActions,
  studies,
  indicesSummary,
  indices,
  indicesTemplateActions,
  propertyValues,
  sequences,
  librariesSummary,
  libraries,
  libraryTemplateActions,
  libraryPrefillTemplates,
  libraryTypes,
  platforms,
  users,
  groups,
  pagination,
  versions,
  workflows,
  labworkSummary,
  studySamples,
  coordinates,
  labworkSteps,
  sampleNextStepTemplateActions,
  steps,
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
