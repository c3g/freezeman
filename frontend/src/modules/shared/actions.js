import Containers from "../containers/actions";
import Individuals from "../individuals/actions";
import Users from "../users/actions";
import Groups from "../groups";
import Samples from "../samples/actions";
import ProcessesSamples from "../processesSamples/actions";
import Protocols from "../protocols/actions";
import {refreshAuthToken} from "../auth/actions";

export const fetchInitialData = () => async (dispatch, getState) => {
    await dispatch(refreshAuthToken())

    if (!getState().auth.tokens.access) return;

    // Higher priority
    await Promise.all([
        Containers.listKinds,
        Containers.listTable,
        Containers.summary,
        Individuals.listTable,
        Samples.listTable,
        Samples.listKinds,
        Samples.summary,
        ProcessesSamples.listTable,
        Protocols.list,
        ProcessesSamples.summary,
        Users.listTable,
        Groups.list,
    ].map(a => dispatch(a())))

    // Lower priority
    await Promise.all([
        Containers.listTemplateActions,
        Samples.listTemplateActions,
        ProcessesSamples.listTemplateActions,
    ].map(a => dispatch(a())))
}

export const fetchSummariesData = () => async (dispatch, getState) => {
    await dispatch(refreshAuthToken())

    if (!getState().auth.tokens.access) return;

    await Promise.all([
        Containers.summary,
        Samples.summary,
        ProcessesSamples.summary,
    ].map(a => dispatch(a())))
};


export const fetchListedData = () => async (dispatch, getState) => {
    await dispatch(refreshAuthToken())

    if (!getState().auth.tokens.access) return;

    // Higher priority
    await Promise.all([
        Containers.listTable,
        Individuals.listTable,
        Samples.listTable,
        ProcessesSamples.listTable,
        Protocols.list,
    ].map(a => dispatch(a())))

    // Lower priority - Fetch summaries
    await Promise.all([
        Containers.summary,
        Samples.summary,
        ProcessesSamples.summary,
    ].map(a => dispatch(a())))
}