import {merge, set} from "object-path-immutable";
import {map} from "rambda"

import {indexByID} from "../../utils/objects";
import mergeArray from "../../utils/mergeArray";

import SEQUENCES from "./actions";

export const sequences = (
    state = {
        itemsByID: {},
        items: [],
        page: { offset: 0 },
        totalCount: 0,
        isFetching: false,
        filters: {},
        sortBy: { key: undefined, order: undefined },
    },
    action
) => {
    switch (action.type) {

        case SEQUENCES.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case SEQUENCES.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case SEQUENCES.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
              { error: action.error, isFetching: false, didFail: true });

        case SEQUENCES.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case SEQUENCES.LIST.RECEIVE: {
            const results = action.data.results.map(preprocess)
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case SEQUENCES.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };
            
        default:
            return state;
    }
};

function preprocess(index) {
    index.isFetching = false;
    index.isLoaded = true;
    return index
}
