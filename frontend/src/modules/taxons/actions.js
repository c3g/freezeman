import { createNetworkActionTypes, networkAction } from "../../utils/actions";
import api from "../../utils/api";

export const GET = createNetworkActionTypes("TAXONS.GET");
export const LIST = createNetworkActionTypes("TAXONS.LIST");
export const ADD = createNetworkActionTypes("TAXONS.ADD");
export const UPDATE = createNetworkActionTypes("TAXONS.UPDATE")

export const get = id => async (dispatch, getState) => {
    const taxon = getState().taxons.itemsByID[id];
    if (taxon && taxon.isFetching)
        return;

    return await dispatch(networkAction(GET, api.taxons.get(id), { meta: { id } }));
};

export const add = taxon => async (dispatch, getState) => {
    if (getState().taxons.isFetching)
        return;

    return await dispatch(networkAction(
        ADD, api.taxons.add(taxon), { meta: { ignoreError: 'APIError' } }
    ));
};

export const update = (id, taxon) => async (dispatch, getState) => {
    if (getState().taxons.itemsByID[id].isFetching)
        return;

    return await dispatch(networkAction(
        UPDATE, api.taxons.update(taxon), { meta: { id, ignoreError: 'APIError' } }
    ));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.taxons.list(params),
        { meta: params }
    ));
};

export default {
    GET,
    LIST,
    get,
    list,
    add,
    update
};