import Containers from "../containers/actions";
import Individuals from "../individuals/actions";
import Users from "../users/actions";
import Samples from "../samples/actions";
import {refreshAuthToken} from "../auth/actions";

export const fetchInitialData = () => async (dispatch, getState) => {
    await dispatch(refreshAuthToken())

    if (!getState().auth.tokens.access) return;

    await Promise.all([
        Containers.listKinds,
        Containers.list,
        Individuals.list,
        Samples.list,
        Users.list,
    ].map(a => dispatch(a())))
}

export const fetchAuthorizedData = () => async (dispatch, getState) => {
    await dispatch(refreshAuthToken())

    if (!getState().auth.tokens.access) return;

    await Promise.all([
        Containers.list,
        Individuals.list,
        Samples.list,
        Users.list,
    ].map(a => dispatch(a())))
};
