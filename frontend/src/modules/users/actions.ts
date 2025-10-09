import { FMSId } from "../../models/fms_api_models";
import { AppDispatch, RootState } from "../../store";
import { createNetworkActionTypes, networkAction } from "../../utils/actions"
import api from "../../utils/api"

export const GET = createNetworkActionTypes("USERS.GET");
export const ADD = createNetworkActionTypes("USERS.ADD");
export const UPDATE = createNetworkActionTypes("USERS.UPDATE");
export const LIST = createNetworkActionTypes("USERS.LIST");
export const LIST_REVISIONS = createNetworkActionTypes("USERS.LIST_REVISIONS");
export const LIST_VERSIONS = createNetworkActionTypes("USERS.LIST_VERSIONS");

export const get = (id: FMSId) => async (dispatch: AppDispatch, getState: () => RootState) => {
    const user = getState().users.itemsByID[id];
    if (user && user.isFetching)
        return;

    return await dispatch(networkAction(GET, api.users.get(id), { meta: { id } }));
};

export const add = user => async (dispatch, getState) => {
    if (getState().users.isFetching)
        return;

    return await dispatch(networkAction(
        ADD, api.users.add(user), { meta: { ignoreError: 'APIError' } }));
};

export const update = (id, user) => async (dispatch, getState) => {
    if (getState().users.itemsByID[id].isFetching)
        return;

    return await dispatch(networkAction(
        UPDATE, api.users.update(user), { meta: { id, ignoreError: 'APIError' }}));
};

export const updateSelf = (user) => async (dispatch, getState) => {
    const id = getState().auth.currentUserID
    if (!id || getState().users.itemsByID[id].isFetching)
        return;

    return await dispatch(networkAction(
        UPDATE, api.users.updateSelf(user), { meta: { id, ignoreError: 'APIError' }}));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.users.list(params),
        { meta: params }
    ));
};

export const listRevisions = (id) => (dispatch, getState) => {
    const user = getState().users.itemsByID[id];
    if (user.isFetching) return Promise.resolve();
    const meta = { id };
    return dispatch(
        networkAction(
            LIST_REVISIONS,
            api.users.listRevisions(id, user?.revisions?.next ?? { limit: 100 }),
            { meta }
        )
    );
}

export const listVersions = (userId, revisionId) => (dispatch, getState) => {
    const user = getState().users.itemsByID[userId];
    if (user.isFetching) return Promise.resolve();
    const meta = { id: userId };
    return dispatch(
        networkAction(
            LIST_VERSIONS,
            api.users.listVersions(userId, {revision__id: revisionId, limit: 10000}),
            { meta }
        )
    );
}

export default {
    GET,
    ADD,
    UPDATE,
    LIST,
    LIST_REVISIONS,
    LIST_VERSIONS,
    get,
    add,
    update,
    list,
    listRevisions,
    listVersions,
};
