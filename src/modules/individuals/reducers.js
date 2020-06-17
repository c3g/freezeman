import { merge } from "object-path-immutable";

import {indexByID} from "../../utils/objects";
import mergeArray from "../../utils/mergeArray";
import INDIVIDUALS from "./actions";

export const individuals = (
    state = {
        itemsByID: {},
        items: [],
        page: { limit: 0, offset: 0 },
        totalCount: 0,
        isFetching: false,
    },
    action
) => {
    switch (action.type) {

        case INDIVIDUALS.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case INDIVIDUALS.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case INDIVIDUALS.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id], { error: action.error, isFetching: false });

        case INDIVIDUALS.LIST.REQUEST:
            return { ...state, isFetching: true };
        case INDIVIDUALS.LIST.RECEIVE: {
            const hasChanged = state.totalCount !== action.data.count;
            const currentItems = hasChanged ? [] : state.items;
            const itemsByID = merge(state.itemsByID, [], indexByID(action.data.results, "id"));
            const itemsID = action.data.results.map(r => r.id)
            const items = mergeArray(currentItems, action.meta.offset, itemsID)
            return {
                ...state,
                itemsByID,
                items,
                totalCount: action.data.count,
                page: action.meta,
                isFetching: false,
            };
        }
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
