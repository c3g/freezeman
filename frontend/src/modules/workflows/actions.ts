import { ObjectId } from "../../models/frontend_models";
import { createNetworkActionTypes, networkAction } from "../../utils/actions";
import api from "../../utils/api";

export const GET = createNetworkActionTypes("WORKFLOWS.GET");
export const LIST = createNetworkActionTypes("WORKFLOWS.LIST");

export const get = (id : ObjectId )=> async (dispatch, getState) => {
    const workflow = getState().workflows.itemsByID[id];
    if (workflow && workflow.isFetching)
        return;

    return await dispatch(networkAction(GET, api.workflows.get(id), { meta: { id } }));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.workflows.list(params),
        { meta: params }
    ));
};

export default {
    GET,
    LIST,
    get,
    list,
};

