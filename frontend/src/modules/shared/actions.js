import Containers from "../containers/actions";
import Individuals from "../individuals/actions";
import Users from "../users/actions";
import Groups from "../groups";
import Samples from "../samples/actions";
import Processes from "../processes/actions";
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
        Processes.listTable,
        Processes.listProtocols,
        Processes.summary,
        Users.listTable,
        Groups.list,
    ].map(a => dispatch(a())))

    // Lower priority
    await Promise.all([
        Containers.listTemplateActions,
        Samples.listTemplateActions,
        Processes.listTemplateActions,
    ].map(a => dispatch(a())))
}

export const fetchAuthorizedData = () => async (dispatch, getState) => {
    await dispatch(refreshAuthToken())

    if (!getState().auth.tokens.access) return;

    await Promise.all([
        Containers.summary,
        Samples.summary,
        Processes.summary,
    ].map(a => dispatch(a())))
};
