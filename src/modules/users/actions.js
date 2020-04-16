import {createNetworkActionTypes, networkAction} from "../../utils/actions";

export const FETCH_USERS = createNetworkActionTypes("FETCH_USERS");

const _fetchUsers = networkAction(FETCH_USERS, "/users/");
export const fetchUsers = () => async (dispatch, getState) => {
    if (getState().users.isFetching) return;
    if (!getState().users.didInvalidate && getState().users.items.length > 0) return;
    await dispatch(_fetchUsers());
}
