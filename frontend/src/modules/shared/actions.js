import Containers from "../containers/actions";
import Individuals from "../individuals/actions";
import Users from "../users/actions";
import Groups from "../groups";
import Samples from "../samples/actions";
import ProcessMeasurements from "../processMeasurements/actions";
import Projects from "../projects/actions";
import Protocols from "../protocols/actions";
import ExperimentRuns from "../experimentRuns/actions";
import {refreshAuthToken} from "../auth/actions";

export const fetchInitialData = () => async (dispatch, getState) => {
    await dispatch(refreshAuthToken())

    if (!getState().auth.tokens.access) return;

    // Higher priority
    await Promise.all([
        Containers.listKinds,
        Containers.summary,
        ExperimentRuns.listInstruments,
        ExperimentRuns.listTypes,
        Samples.listKinds,
        Samples.summary,
        Projects.summary,
        Protocols.list,
        ProcessMeasurements.summary,
        Users.listTable,
        Groups.list,
    ].map(a => dispatch(a())))

    await Promise.all([
        Containers.listTable,
        ExperimentRuns.listTable,
        Individuals.listTable,
        Samples.listTable,
        Projects.listTable,
        ProcessMeasurements.listTable,
    ].map(a => dispatch(a())))

    // Lower priority
    await Promise.all([
        Containers.listTemplateActions,
        Samples.listTemplateActions,
        ProcessMeasurements.listTemplateActions,
        ExperimentRuns.listTemplateActions,
    ].map(a => dispatch(a())))
}

export const fetchSummariesData = () => async (dispatch, getState) => {
    await dispatch(refreshAuthToken())

    if (!getState().auth.tokens.access) return;

    await Promise.all([
        Containers.summary,
        Samples.summary,
        Projects.summary,
        ProcessMeasurements.summary,
    ].map(a => dispatch(a())))
};


export const fetchListedData = () => async (dispatch, getState) => {
    await dispatch(refreshAuthToken())

    if (!getState().auth.tokens.access) return;

    // Higher priority
    await Promise.all([
        Containers.listTable,
        ExperimentRuns.listTable,
        Individuals.listTable,
        Samples.listTable,
        Projects.listTable,
        ProcessMeasurements.listTable,
        Protocols.list,
    ].map(a => dispatch(a())))

    // Lower priority - Fetch summaries
    await Promise.all([
        Containers.summary,
        Samples.summary,
        Projects.listTable,
        ProcessMeasurements.summary,
    ].map(a => dispatch(a())))
}
