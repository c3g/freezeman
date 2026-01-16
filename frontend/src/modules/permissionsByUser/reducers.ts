import {merge} from "object-path-immutable";
import {map} from "rambda"

import {indexByID} from "../../utils/objects";

import PERMISSIONSBYUSER from "./actions";

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
        case PERMISSIONSBYUSER.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case PERMISSIONSBYUSER.LIST.RECEIVE: {
            const results = action.data.results.map(preprocess)
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case PERMISSIONSBYUSER.LIST.ERROR:
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
