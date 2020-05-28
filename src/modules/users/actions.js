import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import {constVal} from "../../utils/functions";

export const LIST          = createNetworkActionTypes("USERS.LIST");
export const LIST_VERSIONS = createNetworkActionTypes("USERS.LIST_VERSIONS");

const _list = networkAction(LIST, constVal("/users/"));
export const list = () => async (dispatch, getState) => {
    if (getState().users.isFetching) return;
    await dispatch(_list());
}

const _listVersions = networkAction(LIST_VERSIONS, params => `/versions?revision__user=${params.id}`);
export const listVersions = (id) => (dispatch, getState) => {
    if (getState().users.itemsByID[id].isFetching) return Promise.resolve();
    const params = { id }
    return dispatch(_listVersions(undefined, params));
}

export default {
    LIST,
    LIST_VERSIONS,
    list,
    listVersions,
};

