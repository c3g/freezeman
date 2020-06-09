import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import {constVal} from "../../utils/functions";

export const LIST = createNetworkActionTypes("INDIVIDUALS.LIST");

const _list = networkAction(LIST, constVal("/individuals/"));
export const list = () => async (dispatch, getState) => {
    if (getState().individuals.isFetching) return;
    if (!getState().individuals.didInvalidate && getState().individuals.serverCount > 0) return;
    await dispatch(_list());
}

export default {
    LIST,
    list,
};
