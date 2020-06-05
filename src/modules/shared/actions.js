import {fetchContainerKinds, fetchContainers} from "../containers/actions";
import {fetchIndividuals} from "../individuals/actions";
import Users from "../users/actions";
import Samples from "../samples/actions";
import {refreshAuthToken} from "../auth/actions";

export const fetchAuthorizedData = () => async (dispatch, getState) => {
    await dispatch(refreshAuthToken())

    if (!getState().auth.tokens.access) return;

    await Promise.all([
        fetchContainerKinds,
        fetchContainers,
        fetchIndividuals,
        Samples.list,
        Users.list,
    ].map(a => dispatch(a())))
};
