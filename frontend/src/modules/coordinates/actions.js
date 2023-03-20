import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";

export const GET                   = createNetworkActionTypes("COORDINATES.GET");
export const LIST                  = createNetworkActionTypes("COORDINATES.LIST");

export const get = id => async (dispatch, getState) => {
    const coordinate = getState().coordinates.itemsByID[id];
    if (coordinate && coordinate.isFetching)
        return;

    return await dispatch(networkAction(GET, api.coordinates.get(id), { meta: { id } }));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.coordinates.list(params),
        { meta: params }
    ));
};

export default {
    GET,
    LIST,
    get,
    list,
};