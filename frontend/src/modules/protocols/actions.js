import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";

export const LIST = createNetworkActionTypes("PROTOCOLS.LIST");

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.protocols.list(params),
        { meta: params }
    ));
};

export default {
    LIST,
    list,
};