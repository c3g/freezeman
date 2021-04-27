import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";

export const INFO = createNetworkActionTypes("BASE.INFO");

export const info = (options) => async (dispatch, getState) => {
    return await dispatch(networkAction(INFO,
        api.base.info(),
    ));
};

export default {
    INFO,
    info,
};