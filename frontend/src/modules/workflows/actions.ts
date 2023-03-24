import { ObjectId } from "../../models/frontend_models";
import { networkAction } from "../../utils/actions";
import api from "../../utils/api";
import { GET, LIST } from "./reducers"



export const get = (id : ObjectId )=> async (dispatch, getState) => {
    const workflow = getState().workflows.itemsByID[id];
    if (workflow && workflow.isFetching)
        return;

    return await dispatch(networkAction(GET, api.workflows.get(id), { meta: { id } }));
};

export const list = (options) => async (dispatch) => {
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

