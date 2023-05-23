import { EXPERIMENT_RUN_FILTERS } from "../../components/filters/descriptions";
import { DEFAULT_PAGINATION_LIMIT } from "../../config";
import { createFiltersActions } from "../../models/filter_set_actions";
import { networkAction } from "../../utils/actions";
import api from "../../utils/api";
import serializeFilterParams from "../../utils/serializeFilterParams";
import serializeSortByParams from "../../utils/serializeSortByParams";
import {
    FILTER_ACTION_TYPES,
    FLUSH_EXPERIMENT_RUN_LAUNCH,
    GET,
    LAUNCH_EXPERIMENT_RUN,
    LIST,
    LIST_INSTRUMENTS,
    LIST_PROPERTY_VALUES,
    LIST_TABLE,
    LIST_TEMPLATE_ACTIONS,
    LIST_TYPES,
    SET_SORT_BY
} from './reducers';

// TODO: SUMMARY, LIST_TEMPLATE_ACTIONS

export const get = id => async (dispatch, getState) => {
    const experimentRun = getState().experimentRuns.itemsByID[id];
    if (experimentRun && experimentRun.isFetching)
        return;

    return await dispatch(networkAction(GET, api.experimentRuns.get(id), { meta: { id } }));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.experimentRuns.list(params),
        { meta: params }
    ));
};

export const listTable = ({ offset = 0, limit = DEFAULT_PAGINATION_LIMIT } = {}, abort) => async (dispatch, getState) => {
    const experimentRuns = getState().experimentRuns
    if (experimentRuns.isFetching && !abort)
        return

    const filters = serializeFilterParams(experimentRuns.filters, EXPERIMENT_RUN_FILTERS)
    const ordering = serializeSortByParams(experimentRuns.sortBy)
    const options = { limit, offset, ordering, ...filters}

    return await dispatch(networkAction(LIST_TABLE,
        api.experimentRuns.list(options, abort),
        { meta: { ...options, ignoreError: 'AbortError' } }
    ));
};

export const setSortBy = thenList((key, order) => {
    return {
        type: SET_SORT_BY,
        data: { key, order }
    }
});


const { setFilter: setFilterAction, setFilterOption: setFilterOptionAction, clearFilters: clearFiltersAction} = createFiltersActions(FILTER_ACTION_TYPES)

export const setFilter = thenList(setFilterAction)
export const setFilterOption = thenList(setFilterOptionAction)
export const clearFilters = thenList(clearFiltersAction)

export const listTypes = () => async (dispatch, getState) => {
    if (getState().runTypes.isFetching || getState().runTypes.items.length > 0)
        return;

    return await dispatch(networkAction(LIST_TYPES, api.runTypes.list()));
};

export const listInstruments = () => async (dispatch, getState) => {
    if (getState().instruments.isFetching || getState().instruments.items.length > 0)
        return;

    return await dispatch(networkAction(LIST_INSTRUMENTS, api.instruments.list()));
};

export const listPropertyValues = (params) => async (dispatch, getState) => {
    if (getState().propertyValues.isFetching)
        return;

    const options = {content_type__app_label: "fms_core", ...params}

    return await dispatch(networkAction(LIST_PROPERTY_VALUES,
        api.propertyValues.list(options),
        { meta: { ...options} }
    ));
};

export const listTemplateActions = () => (dispatch, getState) => {
    if (getState().experimentRunTemplateActions.isFetching) return;
    return dispatch(networkAction(LIST_TEMPLATE_ACTIONS, api.experimentRuns.template.actions()));
};

export const launchExperimentRun = (experimentRunId) => async (dispatch, getState) => {
    const meta = {
        experimentRunId
    }
    // Make sure the run isn't already launched
    const launchState = getState().experimentRunLaunches[experimentRunId]
    if (launchState && launchState.status === 'LAUNCHING') {
        return
    }

    // Dispatch the network action
    await dispatch(networkAction(LAUNCH_EXPERIMENT_RUN, api.experimentRuns.launchRunProcessing(experimentRunId), {meta}))
    dispatch(get(experimentRunId))

}

export const flushExperimentRunLaunch = (experimentRunId) => {
    return {
        type: FLUSH_EXPERIMENT_RUN_LAUNCH,
        data: experimentRunId
    }
}

export default {
    get,
    setSortBy,
    setFilter,
    setFilterOption,
    clearFilters,
    list,
    listTable,
    listTypes,
    listInstruments,
    listPropertyValues,
    listTemplateActions,
    launchExperimentRun,
    flushExperimentRunLaunch
};

// Helper to call list() after another action
function thenList(fn) {
    return (...args) => async dispatch => {
        dispatch(fn(...args))
        dispatch(listTable(undefined, true))
    }
}
