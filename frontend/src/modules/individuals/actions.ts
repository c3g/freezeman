import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api"

export const GET = createNetworkActionTypes("INDIVIDUALS.GET");
export const ADD = createNetworkActionTypes("INDIVIDUALS.ADD");
export const UPDATE = createNetworkActionTypes("INDIVIDUALS.UPDATE");
export const LIST = createNetworkActionTypes("INDIVIDUALS.LIST");

export const get = id => async (dispatch, getState) => {
    const individual = getState().individuals.itemsByID[id];
    if (individual && individual.isFetching)
        return;

    return await dispatch(networkAction(GET, api.individuals.get(id), { meta: { id } }));
};

export const add = individual => async (dispatch, getState) => {
    if (getState().individuals.isFetching)
        return;

    return await dispatch(networkAction(
        ADD, api.individuals.add(individual), { meta: { ignoreError: 'APIError' } }));
};

export const update = (id, individual) => async (dispatch, getState) => {
    if (getState().individuals.itemsByID[id].isFetching)
        return;

    return await dispatch(networkAction(
        UPDATE, api.individuals.update(individual), { meta: { id, ignoreError: 'APIError' }}));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.individuals.list(params),
        { meta: params }
    ));
};

export default {
    GET,
    ADD,
    UPDATE,
    LIST,
    get,
    add,
    update,
    list,
};
