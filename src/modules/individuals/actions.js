import {createNetworkActionTypes, networkAction} from "../../utils/actions";

export const FETCH_INDIVIDUALS = createNetworkActionTypes("FETCH_INDIVIDUALS");

const _fetchIndividuals = networkAction(FETCH_INDIVIDUALS, "/individuals/");
export const fetchIndividuals = () => async (dispatch, getState) => {
    if (getState().individuals.isFetching) return;
    if (!getState().individuals.didInvalidate && getState().individuals.items.length > 0) return;
    await dispatch(_fetchIndividuals);
}
