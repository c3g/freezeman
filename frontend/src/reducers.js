import { combineReducers } from "redux";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

import { app } from "./modules/app/reducers";
import { auth } from "./modules/auth/reducers";
import {
  containerKinds,
  containerPrefillTemplates,
  containerTemplateActions,
  containers,
  containersSummary,
} from "./modules/containers/reducers";
import { coordinates } from "./modules/coordinates/reducers";
import { datasetFiles } from "./modules/datasetFiles/reducers";
import { datasets } from "./modules/datasets/reducers";
import { readsets } from "./modules/readsets/reducers";
import {
  experimentRunLanes
} from './modules/experimentRunLanes/reducers';
import {
  externalExperimentRuns
} from "./modules/experimentRuns/externalExperimentsReducers";
import {
  experimentRunLaunches,
  experimentRunTemplateActions,
  experimentRuns,
  instruments,
  propertyValues,
  runTypes
} from "./modules/experimentRuns/reducers";
import { reducer as groups } from "./modules/groups";
import {
  indices,
  indicesSummary,
  indicesTemplateActions
} from "./modules/indices/reducers";
import { individualDetails } from "./modules/individualDetails/reducers";
import { individuals } from "./modules/individuals/reducers";
import { labworkSummary } from "./modules/labwork/reducers";
import { labworkSteps, sampleNextStepTemplateActions } from "./modules/labworkSteps/reducers";
import {
  libraries,
  librariesSummary,
  libraryPrefillTemplates,
  libraryTemplateActions
} from "./modules/libraries/reducers";
import {
  libraryTypes,
} from "./modules/libraryTypes/reducers";
import { notifications } from './modules/notification/reducers';
import { reducer as pagination } from "./modules/pagination";
import {
  platforms,
} from "./modules/platforms/reducers";
import {
  pooledSamples
} from "./modules/pooledSamples/reducers";
import {
  processMeasurementTemplateActions,
  processMeasurements,
  processMeasurementsSummary,
} from "./modules/processMeasurements/reducers";
import {
  processes
} from "./modules/processes/reducers";
import {
  projectTemplateActions,
  projects,
  projectsSummary
} from "./modules/projects/reducers";
import {
  protocols,
} from "./modules/protocols/reducers";
import { referenceGenomes } from './modules/referenceGenomes/reducers';
import {
  sampleKinds,
  samplePrefillTemplates,
  sampleTemplateActions,
  samples,
  samplesSummary,
} from "./modules/samples/reducers";
import {
  sequences,
} from "./modules/sequences/reducers";
import { steps } from './modules/steps/reducers';
import { studies } from "./modules/studies/reducers";
import { studySamples } from "./modules/studySamples/reducers";
import { taxons } from "./modules/taxons/reducers";
import { taxonsTable } from './modules/taxonsTable/reducers'
import { users } from "./modules/users/reducers";
import { versions } from "./modules/versions/reducers";
import { workflows } from "./modules/workflows/reducers";
import { projectsOfSamples } from './modules/projectsOfSamples/reducers'
import { projectsTable} from './modules/projectsTable/reducers'
import { projectSamplesTable } from './modules/projectSamplesTable/reducers'

const AUTH_PERSIST_CONFIG = {
  key: "auth",
  blacklist: ["isFetching"],
  storage,
};

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
  readsets,
  experimentRuns,
  experimentRunLanes,
  externalExperimentRuns,
  experimentRunLaunches,
  experimentRunTemplateActions,
  runTypes,
  individuals,
  taxons,
  taxonsTable,
  referenceGenomes,
  instruments,
  sampleKinds,
  samplesSummary,
  sampleTemplateActions,
  samplePrefillTemplates,
  samples,
  projectSamplesTable,
  pooledSamples,
  protocols,
  processes,
  processMeasurementsSummary,
  processMeasurementTemplateActions,
  processMeasurements,
  projectsSummary,
  projects,
  projectsOfSamples,
  projectsTable,
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
  individualDetails,
  coordinates,
  labworkSteps,
  sampleNextStepTemplateActions,
  steps,
  notifications,
});

export default function rootReducer(state, action) {
  const newState = allReducers(state, action);
  return newState;
}
