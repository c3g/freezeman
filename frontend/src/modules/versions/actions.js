import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import {constVal} from "../../utils/functions";

export const FETCH_SAMPLES = createNetworkActionTypes("VERSIONS.FETCH_SAMPLES");

export default { FETCH_SAMPLES };

const _fetchSamples = networkAction(FETCH_SAMPLES, constVal("/versions/?content_type__model=sample"));
export const fetchSamples = () => async (dispatch, getState) => {
    if (getState().versions.samples.isFetching)
        return;
    await dispatch(_fetchSamples());
}
