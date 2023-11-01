import { merge } from "object-path-immutable";

import { map } from "rambda";
import { createFilterActionTypes } from "../../models/filter_set_actions";
import { reduceClearFilters, reduceSetFilter, reduceSetFilterOptions } from "../../models/paged_items_reducers";
import { createNetworkActionTypes } from "../../utils/actions";
import mergeArray from "../../utils/mergeArray";
import { indexByID } from "../../utils/objects";
import { templateActionsReducerFactory } from "../../utils/templateActions";

export const GET                   = createNetworkActionTypes("EXPERIMENT_RUNS.GET");
export const LIST                  = createNetworkActionTypes("EXPERIMENT_RUNS.LIST");
export const LIST_TABLE            = createNetworkActionTypes("EXPERIMENT_RUNS.LIST_TABLE");
export const SET_SORT_BY           = "EXPERIMENT_RUNS.SET_SORT_BY";
export const FILTER_ACTION_TYPES = createFilterActionTypes('EXPERIMENT_RUNS')
export const { SET_FILTER, SET_FILTER_OPTION, CLEAR_FILTERS} = FILTER_ACTION_TYPES
export const LIST_TYPES            = createNetworkActionTypes("EXPERIMENT_RUNS.LIST_TYPES");
export const LIST_INSTRUMENTS      = createNetworkActionTypes("EXPERIMENT_RUNS.LIST_INSTRUMENTS")
export const LIST_INSTRUMENT_TYPES = createNetworkActionTypes("EXPERIMENT_RUNS.LIST_INSTRUMENT_TYPES")
export const ADD_INSTRUMENT = createNetworkActionTypes("EXPERIMENT_RUNS.ADD_INSTRUMENT")
export const UPDATE_INSTRUMENT = createNetworkActionTypes("EXPERIMENT_RUNS.UPDATE_INSTRUMENT")
export const LIST_PROPERTY_VALUES  = createNetworkActionTypes("EXPERIMENT_RUNS.LIST_PROPERTY_VALUES");
export const LIST_TEMPLATE_ACTIONS = createNetworkActionTypes("EXPERIMENT_RUNS.LIST_TEMPLATE_ACTIONS");
export const LAUNCH_EXPERIMENT_RUN = createNetworkActionTypes("EXPERIMENT_RUNS.LAUNCH_EXPERIMENT_RUN")
export const FLUSH_EXPERIMENT_RUN_LAUNCH = "EXPERIMENT_RUNS.FLUSH_EXPERIMENT_RUN_LAUNCH"

export const experimentRunTemplateActions = templateActionsReducerFactory({LIST_TEMPLATE_ACTIONS});

export const runTypes = (
  state = {
      items: [],
      itemsByID: {},
      isFetching: false,
  },
  action
) => {
    switch (action.type) {
        case LIST_TYPES.REQUEST:
            return {
                ...state,
                isFetching: true,
            };
        case LIST_TYPES.RECEIVE:
            return {
                ...state,
                items: action.data,
                itemsByID: indexByID(action.data, "id"),
                isFetching: false,
            };
        case LIST_TYPES.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error,
            };
        default:
            return state;
    }
};

export const instrumentTypes = (
    state = {
        items: [],
        itemsByID: {},
        isFetching: false,
    }, action
    ) => {
        switch (action.type) {
            case LIST_INSTRUMENT_TYPES.REQUEST:{
                return {
                    ...state,
                    isFetching: true,
                };
            }
            case LIST_INSTRUMENT_TYPES.RECEIVE:{
                const results = action.data.results
                const itemsByID = merge(state.itemsByID, [], indexByID(results));
                return {
                    ...state,
                    items: results.map(result => result.id),
                    itemsByID: itemsByID,
                    isFetching: false,
                };
            }
            case LIST_INSTRUMENT_TYPES.ERROR:{
                return {
                    ...state,
                    isFetching: false,
                    error: action.error,
                };
            }
            default:{
                return state;
            }
        }
    }

export const instruments = (
  state = {
      items: [],
      itemsByID: {},
      isFetching: false,
  },
  action
) => {
    switch (action.type) {
        case LIST_INSTRUMENTS.REQUEST:
            return {
                ...state,
                isFetching: true,
            };
        case LIST_INSTRUMENTS.RECEIVE:
            const results = action.data.results
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return {
                ...state,
                items: results.map(result => result.id),
                itemsByID: itemsByID,
                isFetching: false,
            };
        case LIST_INSTRUMENTS.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error,
            };
        case ADD_INSTRUMENT.REQUEST:
            return {
                ...state,
                isFetching: true,
            }
        case ADD_INSTRUMENT.RECEIVE:
            return {
                ...state,
                isFetching: false
            }
        case ADD_INSTRUMENT.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error
            }
        case UPDATE_INSTRUMENT.REQUEST:
            return {
                ...state,
                isFetching: true,
            }
        case UPDATE_INSTRUMENT.RECEIVE:
            return {
                ...state,
                isFetching: false
            }
        case UPDATE_INSTRUMENT.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error
            }
        default:
            return state;
    }
};

export const propertyValues = (
  state = {
      items: [],
      itemsByID: {},
      isFetching: false,
  },
  action
) => {
    switch (action.type) {
        case LIST_PROPERTY_VALUES.REQUEST:
            return {
                ...state,
                isFetching: true,
            };
        case LIST_PROPERTY_VALUES.RECEIVE:
            return {
                ...state,
                items: action.data,
                itemsByID: indexByID(action.data, "id"),
                isFetching: false,
            };
        case LIST_PROPERTY_VALUES.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error,
            };
        default:
            return state;
    }
};

export const experimentRuns = (
    state = {
        itemsByID: {},
        items: [],
        isFetching: false,
    },
    action
) => {
    switch (action.type) {

        case GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
              { error: action.error, isFetching: false, didFail: true });

        case LIST.REQUEST:
            return { ...state, isFetching: true, };
        case LIST.RECEIVE: {
            const results = action.data.results
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        case LIST_TABLE.REQUEST:
            return { ...state, isFetching: true, };
        case LIST_TABLE.RECEIVE: {
            const totalCount = action.data.length;
            const hasChanged = state.totalCount !== action.data.length;
            const currentItems = hasChanged ? [] : state.items;

            const results = action.data
            const newItemsByID = map(
                s => ({ ...s, container: s.container }), // ??
                indexByID(results)
            );
            const itemsByID = merge(state.itemsByID, [], newItemsByID);
            const itemsID = action.data.map(r => r.id)
            const items = mergeArray(currentItems, action.meta.offset, itemsID)
            return {
                ...state,
                itemsByID,
                items,
                totalCount,
                page: action.meta,
                isFetching: false,
                error: undefined,
            };
        }
        case LIST_TABLE.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        default:
            return state;
    }
}

export const LAUNCH_STATUS = {
    LAUNCHING: 'LAUNCHING',
    LAUNCHED : 'LAUNCHED',
    ERROR: 'ERROR'
}

export const experimentRunLaunches = (state = {launchesById: {}}, action) => {

    const updateLaunchState = (experimentRunId, newState) => {
        const update = {}
        update[experimentRunId] = {
            ...state.launchesById[experimentRunId] ?? {},
            ...newState
        }
        return {
            ...state,
            launchesById: {
                ...state.launchesById,
                ...update
            }
        }
    } 

    switch(action.type) {
        case LAUNCH_EXPERIMENT_RUN.REQUEST: {
            const experimentRunId = action.meta.experimentRunId
            return updateLaunchState(experimentRunId, {
                experimentRunId,
                status: LAUNCH_STATUS.LAUNCHING
            })
        }
        
        case LAUNCH_EXPERIMENT_RUN.RECEIVE: {
            const experimentRunId = action.meta.experimentRunId
            return updateLaunchState(experimentRunId, {
                status: LAUNCH_STATUS.LAUNCHED
            })
        }

        case LAUNCH_EXPERIMENT_RUN.ERROR: {
            const experimentRunId = action.meta.experimentRunId
            return updateLaunchState(experimentRunId, {
                status: LAUNCH_STATUS.ERROR,
                error: action.error
            })
        }

        case FLUSH_EXPERIMENT_RUN_LAUNCH: {
            const experimentRunId = action.data
            const launches = {...state.launchesById}
            delete launches[experimentRunId]
            return {
                ...state,
                launchesById: launches
            }
        }
    }
    return state
}