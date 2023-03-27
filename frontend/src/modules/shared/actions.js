import Containers from "../containers/actions";
import Indices from "../indices/actions";
import Individuals from "../individuals/actions";
import Users from "../users/actions";
import Groups from "../groups";
import Coordinates from "../coordinates/actions"
import Samples from "../samples/actions";
import Libraries from "../libraries/actions";
import LibraryTypes from "../libraryTypes/actions";
import ProcessMeasurements from "../processMeasurements/actions";
import Projects from "../projects/actions";
import Protocols from "../protocols/actions";
import ExperimentRuns from "../experimentRuns/actions";
import Taxons from "../taxons/actions";
import ReferenceGenomes from "../referenceGenomes/actions"
import {refreshAuthToken} from "../auth/actions";
import Datasets from "../datasets/actions";
import DatasetFiles from "../datasetFiles/actions"
import Workflows from "../workflows/actions"
import Steps from '../steps/actions'
import * as SampleNextStep from '../labworkSteps/actions'
import { refreshLabwork } from "../labwork/actions";

export const fetchInitialData = () => async (dispatch, getState) => {
    await dispatch(refreshAuthToken())

    if (!getState().auth.tokens.access) return;

    // Higher priority
    await Promise.allSettled([
        Coordinates.list,
        Containers.listKinds,
        Containers.summary,
        ExperimentRuns.listInstruments,
        ExperimentRuns.listTypes,
        Indices.summary,
        Samples.listKinds,
        Samples.summary,
        LibraryTypes.list,
        Libraries.summary,
        Projects.summary,
        Protocols.list,
        ProcessMeasurements.summary,
        Users.listTable,
        Groups.list,
        Taxons.list,
        ReferenceGenomes.list,
        Steps.list,
        Workflows.list,
    ].map(a => dispatch(a())))

    await Promise.allSettled([
        Containers.listTable,
        ExperimentRuns.listTable,
        Indices.listTable,
        Individuals.listTable,
        Samples.listTable,
        Libraries.listTable,
        Projects.listTable,
        ProcessMeasurements.listTable,
        Datasets.listTable,
        DatasetFiles.listTable,
    ].map(a => dispatch(a())))

    // Lower priority
    await Promise.allSettled([
        Containers.listTemplateActions,
        Indices.listTemplateActions,
        Samples.listTemplateActions,
        Libraries.listTemplateActions,
        ProcessMeasurements.listTemplateActions,
        ExperimentRuns.listTemplateActions,
        Projects.listTemplateActions,
        SampleNextStep.listTemplateActions,
        Samples.listPrefillTemplates,
        Libraries.listPrefillTemplates,
        Containers.listPrefillTemplates,
    ].map(a => dispatch(a())))
}

export const fetchSummariesData = () => async (dispatch, getState) => {
    await dispatch(refreshAuthToken())

    if (!getState().auth.tokens.access) return;

    await Promise.all([
        Containers.summary,
        Indices.summary,
        Samples.summary,
        LibraryTypes.list,
        Libraries.summary,
        Projects.summary,
        ProcessMeasurements.summary,
    ].map(a => dispatch(a())))
};

export const fetchLabworkSummary = () => async (dispatch, getState) => {
    await dispatch(refreshAuthToken())

    if (!getState().auth.tokens.access) {
        return
    }

    await dispatch(refreshLabwork())
}


export const fetchListedData = () => async (dispatch, getState) => {
    await dispatch(refreshAuthToken())

    if (!getState().auth.tokens.access) return;

    // Higher priority
    await Promise.all([
        Containers.listTable,
        ExperimentRuns.listTable,
        Indices.listTable,
        Individuals.listTable,
        Samples.listTable,
        Libraries.listTable,
        Projects.listTable,
        ProcessMeasurements.listTable,
        Protocols.list,
    ].map(a => dispatch(a())))

    // Lower priority - Fetch summaries
    await Promise.all([
        Containers.summary,
        Indices.summary,
        Samples.summary,
        Libraries.summary,
        Projects.summary,
        ProcessMeasurements.summary,
    ].map(a => dispatch(a())))
}
