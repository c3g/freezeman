import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api"


export const GET = createNetworkActionTypes("CONTAINERS.GET");
export const ADD = createNetworkActionTypes("CONTAINERS.ADD");
export const UPDATE = createNetworkActionTypes("CONTAINERS.UPDATE");
export const LIST = createNetworkActionTypes("CONTAINERS.LIST");
export const LIST_PARENTS = createNetworkActionTypes("CONTAINERS.LIST_PARENTS");
export const LIST_CHILDREN = createNetworkActionTypes("CONTAINERS.LIST_CHILDREN");
export const LIST_KINDS = createNetworkActionTypes("CONTAINERS.LIST_KINDS");
export const LIST_TEMPLATE_ACTIONS = createNetworkActionTypes("CONTAINERS.LIST_TEMPLATE_ACTIONS");
export const LIST_PREFILL_TEMPLATES = createNetworkActionTypes("CONTAINERS.LIST_PREFILL_TEMPLATES");
export const SUMMARY = createNetworkActionTypes("CONTAINERS.SUMMARY");

export const get = id => async (dispatch, getState) => {
    const container = getState().containers.itemsByID[id];
    if (container && container.isFetching)
        return;

    return await dispatch(networkAction(GET, api.containers.get(id), { meta: { id } }));
};

export const add = container => async (dispatch, getState) => {
    if (getState().containers.isFetching)
        return;

    return await dispatch(networkAction(
        ADD, api.containers.add(container), { meta: { ignoreError: 'APIError' } }));
};

export const update = (id, container) => async (dispatch, getState) => {
    if (getState().containers.itemsByID[id].isFetching)
        return;

    return await dispatch(networkAction(
        UPDATE, api.containers.update(container), { meta: { id, ignoreError: 'APIError' }}));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.containers.list(params),
        { meta: params }
    ));
};

export const listParents = (id) => async (dispatch, getState) => {
    const container = getState().containers.itemsByID[id];
    if (!container || container.isFetching) return;

    return await dispatch(networkAction(
        LIST_PARENTS,
        api.containers.listParents(id),
        { meta: { id } }
    ));
};

/**
 * @param {String} id
 * @param {String[]} excludes - list of containers already loaded; avoid showing them as loading
 */
export const listChildren = (id, excludes = []) => async (dispatch, getState) => {
    const container = getState().containers.itemsByID[id];
    if (!container || container.isFetching) return;

    return await dispatch(networkAction(
        LIST_CHILDREN,
        api.containers.listChildren(id),
        { meta: { id, excludes } }
    ));
};

export const listKinds = () => async (dispatch, getState) => {
    // Check if we're already fetching or have fetched container kinds first (they won't change dynamically.)
    if (getState().containerKinds.isFetching || getState().containerKinds.items.length > 0)
        return;

    return await dispatch(networkAction(LIST_KINDS, api.containerKinds.list()));
};

export const listTemplateActions = () => (dispatch, getState) => {
    if (getState().containerTemplateActions.isFetching) return;
    return dispatch(networkAction(LIST_TEMPLATE_ACTIONS, api.containers.template.actions()));
};

export const listPrefillTemplates = () => (dispatch, getState) => {
  if (getState().containerPrefillTemplates.isFetching) return;
  return dispatch(networkAction(LIST_PREFILL_TEMPLATES, api.containers.prefill.templates()));
};

export const summary = () => dispatch => dispatch(networkAction(SUMMARY, api.containers.summary()));

export default {
    GET,
    ADD,
    UPDATE,
    LIST,
    LIST_PARENTS,
    LIST_CHILDREN,
    LIST_KINDS,
    LIST_TEMPLATE_ACTIONS,
    LIST_PREFILL_TEMPLATES,
    SUMMARY,
    get,
    add,
    update,
    list,
    listParents,
    listChildren,
    listKinds,
    listTemplateActions,
    listPrefillTemplates,
    summary,
};

