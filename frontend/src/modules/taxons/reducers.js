import {merge} from "object-path-immutable";
import {map} from "rambda"

import {indexByID} from "../../utils/objects";

import TAXONS from "./actions";

export const taxons = (
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

        case TAXONS.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case TAXONS.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case TAXONS.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
              { error: action.error, isFetching: false, didFail: true });

        case TAXONS.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case TAXONS.LIST.RECEIVE: {
            const results = action.data.results.map(preprocess)
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case TAXONS.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };
            
        default:
            return state;
    }
};

function preprocess(taxon) {
    taxon.isFetching = false;
    taxon.isLoaded = true;
    return taxon
}
