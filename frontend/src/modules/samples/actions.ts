import { AppDispatch } from "../../store";
import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";

export const GET                   = createNetworkActionTypes("SAMPLES.GET");
export const ADD                   = createNetworkActionTypes("SAMPLES.ADD");
export const UPDATE                = createNetworkActionTypes("SAMPLES.UPDATE");
export const LIST                  = createNetworkActionTypes("SAMPLES.LIST");
export const LIST_VERSIONS         = createNetworkActionTypes("SAMPLES.LIST_VERSIONS");
export const LIST_KINDS            = createNetworkActionTypes("SAMPLES.LIST_KINDS");
export const LIST_TEMPLATE_ACTIONS = createNetworkActionTypes("SAMPLES.LIST_TEMPLATE_ACTIONS");
export const LIST_PREFILL_TEMPLATES = createNetworkActionTypes("SAMPLES.LIST_PREFILL_TEMPLATES");
export const SUMMARY               = createNetworkActionTypes("SAMPLES.SUMMARY");

export const get = id => async (dispatch, getState) => {
    const sample = getState().samples.itemsByID[id];
    if (sample && sample.isFetching)
        return;

    return await dispatch(networkAction(GET, api.samples.get(id), { meta: { id } }));
};

export const add = sample => async (dispatch, getState) => {
    if (getState().samples.isFetching)
        return;

    return await dispatch(networkAction(
        ADD, api.samples.add(sample), { meta: { ignoreError: 'APIError' } }));
};

export const update = (id, sample) => async (dispatch, getState) => {
    if (getState().samples.itemsByID[id].isFetching)
        return;

    return await dispatch(networkAction(
        UPDATE, api.samples.update(sample), { meta: { id, ignoreError: 'APIError' }}));
};

export const list = (options, abort = false) => async (dispatch: AppDispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.samples.list(params, abort),
        {
            meta: params,
        }
    ));
};

export const listKinds = () => async (dispatch, getState) => {
    // Check if we're already fetching or have fetched sample kinds first
    if (getState().sampleKinds.isFetching || getState().sampleKinds.items.length > 0)
        return;

    return await dispatch(networkAction(LIST_KINDS, api.sampleKinds.list()));
};

export const listTemplateActions = () => (dispatch, getState) => {
    if (getState().sampleTemplateActions.isFetching) return;
    return dispatch(networkAction(LIST_TEMPLATE_ACTIONS, api.samples.template.actions()));
};

export const listPrefillTemplates = () => (dispatch, getState) => {
  if (getState().samplePrefillTemplates.isFetching) return;
  return dispatch(networkAction(LIST_PREFILL_TEMPLATES, api.samples.prefill.templates()));
};

export const listVersions = (id) => async (dispatch, getState) => {
    const sample = getState().samples.itemsByID[id];
    if (!sample || sample.isFetching) return;

    return await dispatch(networkAction(
        LIST_VERSIONS,
        api.samples.listVersions(id),
        { meta: { id } }
    ));
}

export const summary = () => dispatch => dispatch(networkAction(SUMMARY, api.samples.summary()));

export default {
    GET,
    ADD,
    UPDATE,
    LIST,
    SUMMARY,
    LIST_VERSIONS,
    LIST_KINDS,
    LIST_TEMPLATE_ACTIONS,
    LIST_PREFILL_TEMPLATES,
    get,
    add,
    update,
    list,
    listVersions,
    listKinds,
    listTemplateActions,
    listPrefillTemplates,
    summary,
};
