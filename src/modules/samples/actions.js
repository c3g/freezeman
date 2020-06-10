import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api"

export const LIST          = createNetworkActionTypes("SAMPLES.LIST");
export const LIST_VERSIONS = createNetworkActionTypes("SAMPLES.LIST_VERSIONS");

export const list = () => async (dispatch, getState) => {
    if (getState().samples.isFetching) return;
    if (!getState().samples.didInvalidate && getState().samples.totalCount > 0) return;

    await dispatch(networkAction(LIST, api.samples.list()));
}

export const listVersions = (id) => async (dispatch, getState) => {
    if (getState().samples.itemsByID[id].isFetching) return;

    await dispatch(networkAction(
        LIST_VERSIONS,
        api.samples.listVersions(id),
        { meta: { id } }
    ));
}

export default {
    LIST,
    LIST_VERSIONS,
    list,
    listVersions,
};

