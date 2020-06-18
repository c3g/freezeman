import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api"

export const CLEAR  = "QUERY.CLEAR";
export const SEARCH = createNetworkActionTypes("QUERY.SEARCH");

export const clear = () => ({ type: CLEAR })

export const search = (q) => async (dispatch, getState) => {
    await dispatch(networkAction(SEARCH, api.query.search(q)));
}

export default {
    CLEAR,
    SEARCH,
    clear,
    search,
};

