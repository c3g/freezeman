import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import {constVal} from "../../utils/functions";

export const FETCH_USERS = createNetworkActionTypes("FETCH_USERS");

const _fetchUsers = networkAction(FETCH_USERS, constVal("/users/"));
export const fetchUsers = () => async (dispatch, getState) => {
    if (getState().users.isFetching) return;
    if (!getState().users.didInvalidate && getState().users.items.length > 0) return;
    await dispatch(_fetchUsers());
}
