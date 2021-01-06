import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import serializeSortByParams from "../../utils/serializeSortByParams";
import api from "../../utils/api"
import { DEFAULT_PAGINATION_LIMIT } from "../../config";

export const GET = createNetworkActionTypes("INDIVIDUALS.GET");
export const ADD = createNetworkActionTypes("INDIVIDUALS.ADD");
export const UPDATE = createNetworkActionTypes("INDIVIDUALS.UPDATE");
export const LIST = createNetworkActionTypes("INDIVIDUALS.LIST");
export const SET_SORT_BY = "INDIVIDUALS.SET_SORT_BY"

export const get = id => async (dispatch, getState) => {
    const individual = getState().individuals.itemsByID[id];
    if (individual && individual.isFetching)
        return;

    return await dispatch(networkAction(GET, api.individuals.get(id), { meta: { id } }));
};

export const add = individual => async (dispatch, getState) => {
    if (getState().individuals.isFetching)
        return;

    return await dispatch(networkAction(ADD, api.individuals.add(individual)));
};

export const update = (id, individual) => async (dispatch, getState) => {
    if (getState().individuals.itemsByID[id].isFetching)
        return;

    return await dispatch(networkAction(UPDATE, api.individuals.update(individual), { meta: { id } }));
};

export const list = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}) => async (dispatch, getState) => {
    const {individuals} = getState();
    if (individuals.isFetching) return;

    const ordering = serializeSortByParams(individuals.sortBy)
    const options = { limit, offset, ordering }

    return await dispatch(networkAction(LIST,
        api.individuals.list(options),
        { meta: options }
    ));
}

export const setSortBy = (key, order) => {
    return {
        type: SET_SORT_BY,
        data: { key, order }
    }
};

export default {
    GET,
    ADD,
    UPDATE,
    LIST,
    SET_SORT_BY,
    get,
    add,
    update,
    list,
    setSortBy,
};
