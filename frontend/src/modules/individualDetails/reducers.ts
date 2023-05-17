import { WritableDraft } from "immer/dist/types/types-external";
import { createNetworkActionTypes } from "../../utils/actions";
import { AnyAction } from "redux";
import { FetchedState } from "../common";
import { FMSIndividual, FMSSample } from "../../models/fms_api_models";
import produce from "immer";

export const GET_INDIVIDUAL_DETAILS = createNetworkActionTypes('INDIVIDUAL_DETAILS.GET_INDIVIDUAL_DETAILS')

interface Individual {
    individual: FMSIndividual,
    samplesByIndividual: FMSSample[]
}
export interface IndividualsDetailsById {
    [key: number]: Readonly<FetchedState<Individual>>
}
interface IndividualDetailsState {
    itemsByID: IndividualsDetailsById
}
const INITIAL_STATE: IndividualDetailsState = {
    itemsByID: {}
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
                if (state.itemsByID[individualID]) {
                    state.itemsByID[individualID].isFetching = true
                } else {
                    // Study state gets created on first REQUEST call
                    state.itemsByID[individualID] = {
                        isFetching: true,
                    }
                }
                break;
            }
        case GET_INDIVIDUAL_DETAILS.RECEIVE:
            {
                const { individualID, individual, individualSamples } = action.meta
                if (state.itemsByID[individualID]) {
                    state.itemsByID[individualID].isFetching = false
                    state.itemsByID[individualID].data = { ...individual, individualSamples: { ...individualSamples.results } }
                }
                // const results = individualSamples.results
                // const itemsByID = merge(state.IndividualsDetailsById[individualID].data?.samplesByIndividual, [], indexByID(results))
                // return { ...state, itemsByID, isFetching: false, error: undefined }
                break;
            }
        case GET_INDIVIDUAL_DETAILS.ERROR:
            {
                const { individualID } = action.meta
                const { error } = action

                const studySamples = state.itemsByID[individualID]
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