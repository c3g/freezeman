import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api"

export const LIST = createNetworkActionTypes("INDIVIDUALS.LIST");

export const list = () => async (dispatch, getState) => {
    if (getState().individuals.isFetching) return;
    if (!getState().individuals.didInvalidate && getState().individuals.serverCount > 0) return;

    await dispatch(networkAction(LIST, api.individuals.list()));
}

export default {
    LIST,
    list,
};
