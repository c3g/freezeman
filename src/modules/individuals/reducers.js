import { merge } from "object-path-immutable";

import INDIVIDUALS from "./actions";
import {objectsByProperty} from "../../utils/objects";

export const individuals = (
    state = {
        itemsByID: {},
        page: { previous: null, next: null },
        count: 0,
        totalCount: 0,
        isFetching: false,
    },
    action
) => {
    switch (action.type) {
        case INDIVIDUALS.LIST.REQUEST:
            return { ...state, isFetching: true };
        case INDIVIDUALS.LIST.RECEIVE:
            const itemsByID = merge(state.itemsByID, [], objectsByProperty(action.data.results, "id"));
            return {
                ...state,
                itemsByID: itemsByID,
                count: Object.keys(itemsByID).length,
                totalCount: action.data.count,
                isFetching: false,
            };
        case INDIVIDUALS.LIST.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error,
            };

        default:
            return state;
    }
};
