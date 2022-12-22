import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";

export const GET                   = createNetworkActionTypes("REFERENCE_GENOMES.GET");
export const LIST                  = createNetworkActionTypes("REFERENCE_GENOMES.LIST");

export const get = id => async (dispatch, getState) => {
    const reference = getState().referenceGenomes.itemsByID[id];
    if (reference && reference.isFetching)
        return;

    return await dispatch(networkAction(GET, api.referenceGenomes.get(id), { meta: { id } }));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.referenceGenomes.list(params),
        { meta: params }
    ));
};

export default {
    GET,
    LIST,
    get,
    list,
};