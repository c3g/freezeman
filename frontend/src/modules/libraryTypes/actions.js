import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";

export const GET                   = createNetworkActionTypes("LIBRARY_TYPES.GET");
export const LIST                  = createNetworkActionTypes("LIBRARY_TYPES.LIST");

export const get = id => async (dispatch, getState) => {
    const libraryType = getState().libraryTypes.itemsByID[id];
    if (libraryType && libraryType.isFetching)
        return;

    return await dispatch(networkAction(GET, api.libraryTypes.get(id), { meta: { id } }));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.libraryTypes.list(params),
        { meta: params }
    ));
};

export default {
    GET,
    LIST,
    get,
    list,
};