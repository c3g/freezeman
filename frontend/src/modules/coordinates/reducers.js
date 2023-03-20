import {merge} from "object-path-immutable";
import {map} from "rambda"

import {indexByID} from "../../utils/objects";

import COORDINATES from "./actions";

export const coordinates = (
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

        case COORDINATES.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case COORDINATES.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case COORDINATES.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
              { error: action.error, isFetching: false, didFail: true });

        case COORDINATES.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case COORDINATES.LIST.RECEIVE: {
            const results = action.data.results.map(preprocess)
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case COORDINATES.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };
            
        default:
            return state;
    }
};

function preprocess(coordinate) {
    coordinate.isFetching = false;
    coordinate.isLoaded = true;
    return coordinate
}
