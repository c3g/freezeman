import {merge, set} from "object-path-immutable";

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
        filters: {},
        sortBy: { key: undefined, order: undefined },
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

        case INDIVIDUALS.ADD.REQUEST:
            return { ...state, error: undefined, isFetching: true };
        case INDIVIDUALS.ADD.RECEIVE:
            return merge({ ...state, isFetching: false, }, ['itemsByID', action.data.id],
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

        case INDIVIDUALS.SET_SORT_BY:
            return { ...state, sortBy: action.data };
        case INDIVIDUALS.SET_FILTER:
            return {
                ...state,
                filters: set(state.filters, [action.data.name, 'value'], action.data.value),
                page: set(state.page, ['offset'], 0),
            };
        case INDIVIDUALS.SET_FILTER_OPTION:
            return {
                ...state,
                filters: set(
                    state.filters,
                    [action.data.name, 'options', action.data.option],
                    action.data.value
                ),
                page: set(state.page, ['offset'], 0),
            };
        case INDIVIDUALS.CLEAR_FILTERS:
            return {
                ...state,
                filters: {},
                page: set(state.page, ['offset'], 0),
            };

        default:
            return state;
    }
};
