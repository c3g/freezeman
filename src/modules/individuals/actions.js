import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api"
import { DEFAULT_PAGINATION_LIMIT } from "../../config";

export const GET = createNetworkActionTypes("INDIVIDUALS.GET");
export const LIST = createNetworkActionTypes("INDIVIDUALS.LIST");

export const get = id => async (dispatch, getState) => {
    const individual = getState().individuals.itemsByID[id];
    if (individual && individual.isFetching)
        return;

    await dispatch(networkAction(GET, api.individuals.get(id), { meta: { id } }));
};

export const list = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}) => async (dispatch, getState) => {
    const {individuals} = getState();
    if (individuals.isFetching) return;

    const pageOptions = { limit, offset }

    await dispatch(networkAction(LIST,
        api.individuals.list(pageOptions),
        { meta: pageOptions }
    ));
}

export default {
    GET,
    LIST,
    get,
    list,
};
