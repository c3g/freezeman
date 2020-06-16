import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";
import { DEFAULT_PAGINATION_LIMIT } from "../../config";

export const GET           = createNetworkActionTypes("SAMPLES.GET");
export const LIST          = createNetworkActionTypes("SAMPLES.LIST");
export const LIST_VERSIONS = createNetworkActionTypes("SAMPLES.LIST_VERSIONS");

export const get = id => async (dispatch, getState) => {
    const sample = getState().samples.itemsByID[id];
    if (sample && sample.isFetching)
        return;

    await dispatch(networkAction(GET, api.samples.get(id), { meta: { id } }));
};

export const list = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}) => async (dispatch, getState) => {
    if (getState().samples.isFetching) return;

    const pageOptions = { limit, offset }

    await dispatch(networkAction(LIST,
        api.samples.list(pageOptions),
        { meta: pageOptions }
    ));
}

export const listVersions = (id) => async (dispatch, getState) => {
    const sample = getState().samples.itemsByID[id];
    if (!sample || sample.isFetching) return;

    await dispatch(networkAction(
        LIST_VERSIONS,
        api.samples.listVersions(id),
        { meta: { id } }
    ));
}

export default {
    GET,
    LIST,
    LIST_VERSIONS,
    get,
    list,
    listVersions,
};

