import { createNetworkActionTypes, networkAction } from "../../utils/actions";
import api from "../../utils/api";

export const GET                   = createNetworkActionTypes("INDICES.GET");
export const LIST                  = createNetworkActionTypes("INDICES.LIST");
export const SUMMARY               = createNetworkActionTypes("INDICES.SUMMARY");
export const LIST_TEMPLATE_ACTIONS = createNetworkActionTypes("INDICES.LIST_TEMPLATE_ACTIONS");
export const VALIDATE              = createNetworkActionTypes("INDICES.VALIDATE");

export const get = id => async (dispatch, getState) => {
    const index = getState().indices.itemsByID[id];
    if (index && index.isFetching)
        return;

    return await dispatch(networkAction(GET, api.indices.get(id), { meta: { id } }));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.indices.list(params),
        { meta: params }
    ));
};

export const summary = () => dispatch => dispatch(networkAction(SUMMARY, api.indices.summary()));

export const listTemplateActions = () => (dispatch, getState) => {
    if (getState().indicesTemplateActions.isFetching) return;
    return dispatch(networkAction(LIST_TEMPLATE_ACTIONS, api.indices.template.actions()));
};

export const validate = (options) => async (dispatch, getState) => {
    return await dispatch(networkAction(
        VALIDATE,
        api.indices.validate(options)
    ));
};

export default {
    GET,
    LIST,
    SUMMARY,
    LIST_TEMPLATE_ACTIONS,
    VALIDATE,
    get,
    list,
    summary,
    listTemplateActions,
    validate
};
