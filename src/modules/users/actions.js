import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api"

export const LIST          = createNetworkActionTypes("USERS.LIST");
export const LIST_VERSIONS = createNetworkActionTypes("USERS.LIST_VERSIONS");

export const list = () => async (dispatch, getState) => {
    if (getState().users.isFetching) return;
    await dispatch(networkAction(LIST, api.users.list()));
}

export const listVersions = (id) => (dispatch, getState) => {
    if (getState().users.itemsByID[id].isFetching) return Promise.resolve();
    const meta = { id };
    return dispatch(networkAction(LIST, api.users.listVersions(id), { meta }));
}

export default {
    LIST,
    LIST_VERSIONS,
    list,
    listVersions,
};

