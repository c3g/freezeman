import { createNetworkActionTypes, networkAction } from "../../utils/actions";
import api from "../../utils/api";

export const GET = createNetworkActionTypes("READSETS.GET")
export const LIST = createNetworkActionTypes("READSETS.LIST");
export const SET_RELEASE_STATUS = createNetworkActionTypes("READSETS.SET_RELEASE_STATUS")
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

export const setReleaseStatus = (readset) => async (dispatch, getState) => {
    return await dispatch(networkAction(SET_RELEASE_STATUS,
        api.readsets.setReleaseStatus(readset)), { meta: readset.id})
}

export default {
    GET,
    LIST,
    SET_RELEASE_STATUS
}