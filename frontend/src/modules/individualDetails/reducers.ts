import { WritableDraft } from "immer/dist/types/types-external";
import { createNetworkActionTypes } from "../../utils/actions";
import { AnyAction } from "redux";
import { FetchedState } from "../common";
import { FMSIndividual, FMSSample } from "../../models/fms_api_models";
import produce from "immer";
import { PagedItems } from "../../models/paged_items";

export const GET_INDIVIDUAL_DETAILS = createNetworkActionTypes('INDIVIDUAL_DETAILS.GET_INDIVIDUAL_DETAILS')

export interface Individual {
    individual: FMSIndividual,
    samplesByIndividual: PagedItems<FMSSample>
}
export interface IndividualsDetailsById {
    [key: number]: Readonly<FetchedState<Individual>>
}
export interface IndividualDetailsState {
    individualsDetailsById: IndividualsDetailsById
}
const INITIAL_STATE: IndividualDetailsState = {
    individualsDetailsById: {}
}
const INITIAL_PAGED_ITEMS = {
    itemsByID: {},
    items: [],
    page: { offset: 0 },
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
        case GET_INDIVIDUAL_DETAILS.REQUEST:
            {
                const { individualID } = action.meta
                if (state.individualsDetailsById[individualID]) {
                    state.individualsDetailsById[individualID].isFetching = true
                } else {
                    // Study state gets created on first REQUEST call
                    state.individualsDetailsById[individualID] = {
                        isFetching: true,
                    }
                }
                break;
            }
        case GET_INDIVIDUAL_DETAILS.RECEIVE:
            {
                const { individualID, individual, individualSamples } = action.meta
                if (state.individualsDetailsById[individualID]) {
                    state.individualsDetailsById[individualID].isFetching = false
                    state.individualsDetailsById[individualID].data = { individual: { ...individual }, samplesByIndividual: { ...INITIAL_PAGED_ITEMS, items: individualSamples.results } }
                }
                break;
            }
        case GET_INDIVIDUAL_DETAILS.ERROR:
            {
                const { individualID } = action.meta
                const { error } = action

                const studySamples = state.individualsDetailsById[individualID]
                if (studySamples) {
                    studySamples.isFetching = false
                    studySamples.error = error
                }
                break;
            }
        default:
            break
    }

    return state
}