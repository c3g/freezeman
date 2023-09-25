import { merge } from "object-path-immutable"

import { Individual, ItemsByID } from "../../models/frontend_models"
import { indexByID } from "../../utils/objects"
import { resetTable } from "../../utils/reducers"
import INDIVIDUALS from "./actions"

export interface IndividualsState {
    itemsByID: ItemsByID<Individual>
    isFetching: boolean
    error?: any
}

const initialState : IndividualsState = {
    itemsByID: {},
    isFetching: false
}

export const individuals = (
    state = initialState,
    action
) => {
    switch (action.type) {

        case INDIVIDUALS.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case INDIVIDUALS.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case INDIVIDUALS.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id], { error: action.error, isFetching: false });

        case INDIVIDUALS.ADD.REQUEST:
            return { ...state, error: undefined, isFetching: true };
        case INDIVIDUALS.ADD.RECEIVE:
            return merge(resetTable({ ...state, isFetching: false, }), ['itemsByID', action.data.id],
                action.data);
        case INDIVIDUALS.ADD.ERROR:
            return { ...state, error: action.error, isFetching: false };

        case INDIVIDUALS.UPDATE.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case INDIVIDUALS.UPDATE.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false, versions: undefined });
        case INDIVIDUALS.UPDATE.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
                { error: action.error, isFetching: false });

        case INDIVIDUALS.LIST.REQUEST:
            return { ...state, isFetching: true };
        case INDIVIDUALS.LIST.RECEIVE: {
            const results = action.data.results.map(preprocess)
            const itemsByID = merge(state.itemsByID, [], indexByID(results, "id"));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case INDIVIDUALS.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error };

        default:
            return state;
    }
};

function preprocess(individual) {
    individual.isFetching = false
    return individual
}
