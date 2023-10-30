import { networkAction } from "../../utils/actions";
import api from "../../utils/api";
import {
    FLUSH_EXPERIMENT_RUN_LAUNCH,
    GET,
    LAUNCH_EXPERIMENT_RUN,
    LIST,
    LIST_INSTRUMENTS,
    LIST_INSTRUMENT_TYPES,
    LIST_PROPERTY_VALUES,
    LIST_TEMPLATE_ACTIONS,
    LIST_TYPES,
<<<<<<< HEAD
=======
    SET_SORT_BY,
    ADD_INSTRUMENT,
    UPDATE_INSTRUMENT
>>>>>>> origin/master
} from './reducers';

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


export const listTypes = () => async (dispatch, getState) => {
    if (getState().runTypes.isFetching || getState().runTypes.items.length > 0)
        return;

    return await dispatch(networkAction(LIST_TYPES, api.runTypes.list()));
};

export const listInstruments = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST_INSTRUMENTS, api.instruments.list(params)));
};

export const listInstrumentTypes = (options) => async (dispatch, getState) => {
    const params = {limit: 100000, ...options};
    return await dispatch(networkAction(LIST_INSTRUMENT_TYPES, api.instrumentTypes.list(params)));
}

export const addInstrument = (instrument) => async (dispatch, getState) => {
    return await dispatch(networkAction(
        ADD_INSTRUMENT, api.instruments.add(instrument), { meta: { ignoreError: 'APIError' } }
    ));
}
export const updateInstrument = (instrument) => async (dispatch, getState) => {
    return await dispatch(networkAction(
        UPDATE_INSTRUMENT, api.instruments.update(instrument), { meta: {id: instrument.id, ignoreError: 'APIError' } }
    ));
}

export const listPropertyValues = (params) => async (dispatch, getState) => {
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
    list,
    listTypes,
    listInstrumentTypes,
    listInstruments,
    listPropertyValues,
    listTemplateActions,
    launchExperimentRun,
    flushExperimentRunLaunch
};
