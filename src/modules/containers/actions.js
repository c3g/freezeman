import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api"
import {DEFAULT_PAGINATION_LIMIT} from "../../config";

export const LIST_KINDS = createNetworkActionTypes("CONTAINERS.LIST_KINDS");
export const LIST = createNetworkActionTypes("CONTAINERS.LIST");
export const GET = createNetworkActionTypes("CONTAINERS.GET");

export const get = id => async (dispatch, getState) => {
    const container = getState().containers.itemsByID[id];
    if (container && container.isFetching)
        return;

    await dispatch(networkAction(GET, api.containers.get(id), { meta: { id } }));
};

export const list = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}) => async (dispatch, getState) => {
    if (getState().containers.isFetching)
        return;

    const pageOptions = { limit, offset }

    await dispatch(networkAction(LIST,
        api.containers.list(pageOptions),
        { meta: pageOptions }
    ));
};

export const listKinds = () => async (dispatch, getState) => {
    // Check if we're already fetching or have fetched container kinds first (they won't change dynamically.)
    if (getState().containerKinds.isFetching || getState().containerKinds.items.length > 0)
        return;

    await dispatch(networkAction(LIST_KINDS, api.containerKinds.list()));
}

export default {
    GET,
    LIST,
    LIST_KINDS,
    get,
    list,
    listKinds,
}
