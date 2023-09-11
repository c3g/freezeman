import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";

export const GET                   = createNetworkActionTypes("LIBRARIES.GET");
export const LIST                  = createNetworkActionTypes("LIBRARIES.LIST");
export const LIST_TEMPLATE_ACTIONS = createNetworkActionTypes("LIBRARIES.LIST_TEMPLATE_ACTIONS");
export const LIST_PREFILL_TEMPLATES = createNetworkActionTypes("LIBRARIES.LIST_PREFILL_TEMPLATES");
export const SUMMARY               = createNetworkActionTypes("LIBRARIES.SUMMARY");

export const get = id => async (dispatch, getState) => {
    const library = getState().libraries.itemsByID[id];
    if (library && library.isFetching)
        return;

    return await dispatch(networkAction(GET, api.libraries.get(id), { meta: { id } }));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.libraries.list(params),
        { meta: params }
    ));
};

export const listTemplateActions = () => (dispatch, getState) => {
    if (getState().libraryTemplateActions.isFetching) return;
    return dispatch(networkAction(LIST_TEMPLATE_ACTIONS, api.libraries.template.actions()));
};

export const listPrefillTemplates = () => (dispatch, getState) => {
  if (getState().libraryPrefillTemplates.isFetching) return;
  return dispatch(networkAction(LIST_PREFILL_TEMPLATES, api.libraries.prefill.templates()));
};

export const summary = () => dispatch => dispatch(networkAction(SUMMARY, api.libraries.summary()));

export default {
    GET,
    LIST,
    LIST_TEMPLATE_ACTIONS,
    LIST_PREFILL_TEMPLATES,
    SUMMARY,
    get,
    list,
    listTemplateActions,
    listPrefillTemplates,
    summary,
};
