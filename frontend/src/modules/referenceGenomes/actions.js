import { createNetworkActionTypes, networkAction } from "../../utils/actions";
import api from "../../utils/api";

export const GET = createNetworkActionTypes("REFERENCE_GENOMES.GET");
export const LIST = createNetworkActionTypes("REFERENCE_GENOMES.LIST");
export const ADD = createNetworkActionTypes("REFERENCE_GENOMES.ADD");
export const UPDATE = createNetworkActionTypes("REFERENCE_GENOMES.UPDATE");

export const get = id => async (dispatch, getState) => {
    const reference = getState().referenceGenomes.itemsByID[id];
    if (reference && reference.isFetching)
        return;

    return await dispatch(networkAction(GET, api.referenceGenomes.get(id), { meta: { id } }));
};

export const add = referenceGenome => async (dispatch, getState) => {
    if (getState().referenceGenomes.isFetching)
        return;

    return await dispatch(networkAction(
        ADD, api.referenceGenomes.add(referenceGenome), { meta: { ignoreError: 'APIError' } }
    ));
};

export const update = (id, referenceGenome) => async (dispatch, getState) => {
    if (getState().referenceGenomes.itemsByID[id].isFetching)
        return;

    return await dispatch(networkAction(
        UPDATE, api.referenceGenomes.update(referenceGenome), { meta: { id, ignoreError: 'APIError' } }
    ));
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
    add,
    update
};