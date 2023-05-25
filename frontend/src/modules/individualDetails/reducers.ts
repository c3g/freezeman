import { WritableDraft } from "immer/dist/types/types-external";
import { createNetworkActionTypes } from "../../utils/actions";
import { AnyAction } from "redux";
import { FetchedState } from "../common";
import { FMSIndividual, FMSSample } from "../../models/fms_api_models";
import produce from "immer";
import { PagedItems } from "../../models/paged_items";
import { createItemsByID } from "../../models/frontend_models";
import { clearFiltersReducer, setFilterReducer } from "../../components/shared/WorkflowSamplesTable/FilterReducers";

export const LIST_TABLE = createNetworkActionTypes('INDIVIDUAL_DETAILS.LIST_TABLE')
export const REFRESH_TABLE = createNetworkActionTypes('INDIVIDUAL_DETAILS.REFRESH_TABLE')
export const SET_INDIVIDUAL_DETAILS_SAMPLES_FILTER = 'INDIVIDUAL_DETAILS.SET_INDIVIDUAL_SAMPLES_FILTER'
export const REMOVE_INDIVIDUAL_DETAILS_SAMPLES_FILTER = 'INDIVIDUAL_DETAILS.REMOVE_INDIVIDUAL_SAMPLES_FILTER'
export const CLEAR_FILTERS = "INDIVIDUAL_DETAILS.CLEAR_FILTERS"

export interface Individual {
    individual: FMSIndividual,
    samplesByIndividual: PagedItems<FMSSample>
}
export interface IndividualDetailsState {
    [key: number]: Readonly<FetchedState<Individual>>
}

const INITIAL_STATE: IndividualDetailsState = {}
const INITIAL_PAGED_ITEMS = {
    itemsByID: {},
    items: [],
    page: {
        pageNumber: 0,
        offset: 0,
        limit: 0
    },
    totalCount: 0,
    isFetching: false,
    filters: {},
    sortBy: { key: undefined, order: undefined },
}

export const individualDetails = (inputState: IndividualDetailsState = INITIAL_STATE, action: AnyAction) => {
    return produce(inputState, (draft) => {
        return individualDetailsReducer(draft, action)
    })
}

export const individualDetailsReducer = (state: WritableDraft<IndividualDetailsState>, action: AnyAction) => {
    switch (action.type) {
        case REFRESH_TABLE.RECEIVE: {
            const { individualID } = action.meta
            state[individualID] = {
                isFetching: true
            }
        }
        case LIST_TABLE.REQUEST: {
            const { individualID } = action.meta
            if (!state[individualID]) {
                state[individualID] = {
                    ...state,
                    isFetching: true
                }
            }
            break;
        }
        case LIST_TABLE.RECEIVE: {
            const { individualID, individual } = action.meta
            state[individualID].isFetching = false
            state[individualID].data = {
                ...state,
                individual: { ...individual },
                samplesByIndividual: {
                    ...INITIAL_PAGED_ITEMS,
                    items: action.data.results.map(r => r.id),
                    itemsByID: createItemsByID(action.data.results)
                }
            }
            break;
        }
        case LIST_TABLE.ERROR: {
            return { ...state, isFetching: false, error: action.error, };
        }
        case SET_INDIVIDUAL_DETAILS_SAMPLES_FILTER: {
            const { individualID, description, value } = action
            const samplesByIndividual = state[individualID]?.data?.samplesByIndividual
            if (samplesByIndividual) {
                samplesByIndividual.filters = setFilterReducer(samplesByIndividual.filters ?? {}, description, value)
            }
            break;
        }
        case CLEAR_FILTERS: {
            const { individualID } = action
            const samplesByIndividual = state[individualID]?.data?.samplesByIndividual
            if (samplesByIndividual) {
                samplesByIndividual.filters = clearFiltersReducer()
            }
            break;
        }
        default:
            break
    }

    return state
}