import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import {constVal} from "../../utils/functions";

export const FETCH_SAMPLES = createNetworkActionTypes("FETCH_SAMPLES");

const _fetchSamples = networkAction(FETCH_SAMPLES, constVal("/samples/"));
export const fetchSamples = () => async (dispatch, getState) => {
    if (getState().samples.isFetching) return;
    // TODO: Account for pagination
    if (!getState().samples.didInvalidate && getState().samples.items.length > 0) return;
    await dispatch(_fetchSamples());
}
