import {merge} from "object-path-immutable";

import {indexByID} from "../../utils/objects";

import REFRENCE_GENOMES from "./actions";

export const referenceGenomes = (
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

        case REFRENCE_GENOMES.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case REFRENCE_GENOMES.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case REFRENCE_GENOMES.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
              { error: action.error, isFetching: false, didFail: true });

        case REFRENCE_GENOMES.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case REFRENCE_GENOMES.LIST.RECEIVE: {
            const results = action.data.results.map(preprocess)
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case REFRENCE_GENOMES.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };
            
        default:
            return state;
    }
};

function preprocess(referenceGenome) {
    referenceGenome.isFetching = false;
    referenceGenome.isLoaded = true;
    return referenceGenome
}
