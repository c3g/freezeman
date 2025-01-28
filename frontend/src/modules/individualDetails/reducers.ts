import { createNetworkActionTypes } from "../../utils/actions";
import { AnyAction } from "redux";
import produce, { castDraft, Draft } from "immer";
import { Sample, createItemsByID, preprocess } from "../../models/frontend_models";
import { IndividualDetails, IndividualDetailsById } from "./models";
import { clearFilters, setFilterValue } from "../../models/filter_set_reducers"
import { createPagedItemsByID } from "../../models/paged_items"

export const LIST_TABLE = createNetworkActionTypes('INDIVIDUAL_DETAILS.LIST_TABLE')
export const SET_SORT_BY = 'INDIVIDUAL_DETAILS.SET_SORT_BY'
export const SET_INDIVIDUAL_DETAILS_SAMPLES_FILTER = 'INDIVIDUAL_DETAILS.SET_INDIVIDUAL_SAMPLES_FILTER'
export const CLEAR_FILTERS = "INDIVIDUAL_DETAILS.CLEAR_FILTERS"
export const FLUSH_INDIVIDUAL_DETAILS = "INDIVIDUAL_DETAILS.FLUSH_INDIVIDUAL_DETAILS"

const INITIAL_STATE: IndividualDetailsById = {}
const INITIAL_PAGED_ITEMS = createPagedItemsByID<Sample>()

export const individualDetails = (inputState: IndividualDetailsById = INITIAL_STATE, action: AnyAction) => {
    return produce(inputState, (draft) => {
        return individualDetailsReducer(draft, action)
    })
}

const individualDetailsReducer = (state: Draft<IndividualDetailsById>, action: AnyAction) => {
    switch (action.type) {
        case LIST_TABLE.REQUEST: {
            const { individualID } = action.meta
            if (!state[individualID]) {
                const details : IndividualDetails = {
                    individual: preprocess({ id: individualID }),
                    samplesByIndividual: {
                        ...INITIAL_PAGED_ITEMS
                    }
                }
                // castDraft solves a typing issue with the items array being a 'readonly number[]'
                // https://immerjs.github.io/immer/typescript/#cast-utilities
                state[individualID] = castDraft(details)
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
                    sortByList: state[individualID].samplesByIndividual.sortByList,
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
                samplesByIndividual.filters = setFilterValue(samplesByIndividual.filters ?? {}, description, value)
            }
            break;
        }
        case CLEAR_FILTERS: {
            const { individualID } = action
            const samplesByIndividual = state[individualID].samplesByIndividual
            if (samplesByIndividual) {
                samplesByIndividual.filters = clearFilters(samplesByIndividual.filters)
            }
            break;
        }
        case SET_SORT_BY: {
            const { individualID, sortBy } = action
            const samplesByIndividual = state[individualID].samplesByIndividual
            if (samplesByIndividual) {
                samplesByIndividual.sortByList = sortBy
            }
            break;
        }
        case FLUSH_INDIVIDUAL_DETAILS: {
            const { individualID } = action
            if (state[individualID]) {
                delete state[individualID]
            }
            break;
        }
        default:
            break
    }
    return state
}

