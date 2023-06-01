import { WritableDraft } from "immer/dist/types/types-external";
import { createNetworkActionTypes } from "../../utils/actions";
import { AnyAction } from "redux";
import { FMSId, FMSSample } from "../../models/fms_api_models";
import produce from "immer";
import { PagedItems } from "../../models/paged_items";
import { Individual, createItemsByID, preprocess } from "../../models/frontend_models";
import { clearFiltersReducer, setFilterReducer } from "../../components/shared/WorkflowSamplesTable/FilterReducers";

export const LIST_TABLE = createNetworkActionTypes('INDIVIDUAL_DETAILS.LIST_TABLE')
export const SET_SORT_BY = 'INDIVIDUAL_DETAILS.SET_SORT_BY'
export const SET_INDIVIDUAL_DETAILS_SAMPLES_FILTER = 'INDIVIDUAL_DETAILS.SET_INDIVIDUAL_SAMPLES_FILTER'
export const CLEAR_FILTERS = "INDIVIDUAL_DETAILS.CLEAR_FILTERS"

export interface IndividualDetails {
    individual: Individual,
    samplesByIndividual: PagedItems<FMSSample>
}

export interface IndividualDetailsById {
    // key: FMSId for individual mapping individualDetails
    [key: FMSId]: Readonly<IndividualDetails>
}

const INITIAL_STATE: IndividualDetailsById = {}
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

export const individualDetails = (inputState: IndividualDetailsById = INITIAL_STATE, action: AnyAction) => {
    return produce(inputState, (draft) => {
        return individualDetailsReducer(draft, action)
    })
}

const individualDetailsReducer = (state: WritableDraft<IndividualDetailsById>, action: AnyAction) => {
    switch (action.type) {
        case LIST_TABLE.REQUEST: {
            const { individualID } = action.meta
            if (!state[individualID]) {
                state[individualID] = {
                    individual: preprocess(undefined),
                    samplesByIndividual: {
                        ...INITIAL_PAGED_ITEMS
                    }
                }
            }
            break;
        }
        case LIST_TABLE.RECEIVE: {
            const { individualID, individual } = action.meta
            state[individualID] = {
                ...state[individualID],
                individual: preprocess(individual),
                samplesByIndividual: {
                    ...INITIAL_PAGED_ITEMS,
                    items: action.data.results.map(r => r.id),
                    itemsByID: createItemsByID(action.data.results),
                    filters: state[individualID].samplesByIndividual.filters ?? {},
                    sortBy: state[individualID].samplesByIndividual.sortBy ?? {},
                }
            }
            break;
        }
        case LIST_TABLE.ERROR: {
            return { ...state, error: action.error };
        }
        case SET_INDIVIDUAL_DETAILS_SAMPLES_FILTER: {
            const { individualID, description, value } = action
            const samplesByIndividual = state[individualID].samplesByIndividual
            if (samplesByIndividual) {
                samplesByIndividual.filters = setFilterReducer(samplesByIndividual.filters ?? {}, description, value)
            }
            break;
        }
        case CLEAR_FILTERS: {
            const { individualID } = action
            const samplesByIndividual = state[individualID].samplesByIndividual
            if (samplesByIndividual) {
                samplesByIndividual.filters = clearFiltersReducer()
            }
            break;
        }
        case SET_SORT_BY: {
            const { individualID, sortBy } = action
            const samplesByIndividual = state[individualID].samplesByIndividual
            if (samplesByIndividual) {
                samplesByIndividual.sortBy = sortBy
            }
            break;
        }
        default:
            break
    }
    return state
}