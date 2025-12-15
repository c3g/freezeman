import { Biosample } from "../../models/frontend_models";
import { createNetworkActionTypes, networkAction } from "../../utils/actions";
import api from "../../utils/api";

export const GET = createNetworkActionTypes("BIOSAMPLES.GET")
export const LIST = createNetworkActionTypes("BIOSAMPLES.LIST");

export const get = id => async (dispatch, getState) => {
    const biosample: Biosample = getState().biosamples.itemsByID[id];
    if (biosample && biosample.isFetching)
        return;

    return await dispatch(networkAction(GET, api.biosamples.get(id), { meta: { id } }));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.biosamples.list(params),
        { meta: params }
    ));
};

export default {
    GET,
    LIST,
}