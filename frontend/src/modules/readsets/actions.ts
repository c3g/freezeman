import { createNetworkActionTypes, networkAction } from "../../utils/actions";
import api from "../../utils/api";

export const GET = createNetworkActionTypes("READSETS.GET")
export const LIST = createNetworkActionTypes("READSETS.LIST");

export const get = id => async (dispatch, getState) => {
    const readset = getState().readsets.itemsByID[id];
    if (readset && readset.isFetching)
        return;

    return await dispatch(networkAction(GET, api.readsets.get(id), { meta: { id } }));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.readsets.list(params),
        { meta: params }
    ));
};

export default {
    GET,
    LIST
}