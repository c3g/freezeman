import { ReleaseStatus } from "../../models/fms_api_models";
import { Readset } from "../../models/frontend_models";
import { AppDispatch } from "../../store";
import { createNetworkActionTypes, networkAction } from "../../utils/actions";
import api from "../../utils/api";

export const GET = createNetworkActionTypes("READSETS.GET")
export const LIST = createNetworkActionTypes("READSETS.LIST");
export const LIST_WITH_METRICS = createNetworkActionTypes("READSETS.LIST_WITH_METRICS");
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

export const listWithMetrics = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options, withMetrics: true }
    return await dispatch(networkAction(LIST_WITH_METRICS,
        api.readsets.list(params),
        { meta: params }
    ));
};

export default {
    GET,
    LIST,
    LIST_WITH_METRICS,
    SET_RELEASE_STATUS
}