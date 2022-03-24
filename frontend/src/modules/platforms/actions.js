import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";

export const GET                   = createNetworkActionTypes("PLATFORMS.GET");
export const LIST                  = createNetworkActionTypes("PLATFORMS.LIST");

export const get = id => async (dispatch, getState) => {
    const platform = getState().platforms.itemsByID[id];
    if (platform && platform.isFetching)
        return;

    return await dispatch(networkAction(GET, api.platforms.get(id), { meta: { id } }));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.platforms.list(params),
        { meta: params }
    ));
};

export default {
    GET,
    LIST,
    get,
    list,
};
