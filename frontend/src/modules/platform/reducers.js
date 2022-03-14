import {merge} from "object-path-immutable";
import {map} from "rambda"

import {indexByID} from "../../utils/objects";

import PLATFORMS from "./actions";

export const platforms = (
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

        case PLATFORMS.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case PLATFORMS.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case PLATFORMS.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
              { error: action.error, isFetching: false, didFail: true });

        case PLATFORMS.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case PLATFORMS.LIST.RECEIVE: {
            const results = action.data.results.map(preprocess)
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case PLATFORMS.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };
            
        default:
            return state;
    }
};

function preprocess(platform) {
    platform.isFetching = false;
    platform.isLoaded = true;
    return platform
}
