import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";

export const GET                   = createNetworkActionTypes("SEQUENCES.GET");
export const LIST                  = createNetworkActionTypes("SEQUENCES.LIST");

export const get = id => async (dispatch, getState) => {
    const sequence = getState().sequences.itemsByID[id];
    if (sequence && sequence.isFetching)
        return;

    return await dispatch(networkAction(GET, api.sequences.get(id), { meta: { id } }));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.sequences.list(params),
        { meta: params }
    ));
};

export default {
    GET,
    LIST,
    get,
    list,
};
