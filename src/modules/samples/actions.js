import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import {constVal} from "../../utils/functions";

export const LIST          = createNetworkActionTypes("SAMPLES.LIST");
export const LIST_VERSIONS = createNetworkActionTypes("SAMPLES.LIST_VERSIONS");

// TODO: Account for pagination

const _list = networkAction(LIST, constVal("/samples/"));
export const list = () => async (dispatch, getState) => {
    if (getState().samples.isFetching) return;
    if (!getState().samples.didInvalidate && getState().samples.serverCount > 0) return;
    await dispatch(_list());
}

const _listVersions = networkAction(LIST_VERSIONS, params => `/samples/${params.id}/versions`);
export const listVersions = (id) => async (dispatch, getState) => {
    if (getState().samples.itemsByID[id].isFetching) return;
    const params = { id }
    await dispatch(_listVersions(undefined, params));
}

export default {
    LIST,
    LIST_VERSIONS,
    list,
    listVersions,
};

