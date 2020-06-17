import { merge, set } from "object-path-immutable";
import {objectsByProperty} from "../../utils/objects";
import mergeArray from "../../utils/mergeArray";

import CONTAINERS from "./actions";

export const containerKinds = (
    state = {
        items: [],
        itemsByID: {},
        isFetching: false,
    },
    action
) => {
    switch (action.type) {
        case CONTAINERS.LIST_KINDS.REQUEST:
            return {
                ...state,
                isFetching: true,
            };
        case CONTAINERS.LIST_KINDS.RECEIVE:
            return {
                ...state,
                items: action.data,
                itemsByID: objectsByProperty(action.data, "id"),
                isFetching: false,
            };
        case CONTAINERS.LIST_KINDS.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error,
            };
        default:
            return state;
    }
}

export const containers = (
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
        case CONTAINERS.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case CONTAINERS.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...preprocessContainer(action.data), isFetching: false });
        case CONTAINERS.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id], { error: action.error, isFetching: false, didFail: true });

        case CONTAINERS.LIST.REQUEST:
            return { ...state, isFetching: true };
        case CONTAINERS.LIST.RECEIVE: {
            const hasChanged = state.totalCount !== action.data.count;
            const currentItems = hasChanged ? [] : state.items;
            const results = action.data.results.map(preprocessContainer)
            const itemsByID = merge(state.itemsByID, [], objectsByProperty(results, "id"));
            const itemsID = results.map(r => r.id)
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
        case CONTAINERS.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error };

        default:
            return state;
    }
};

// TODO: delete this when the API returns .id instead of .barcode
function preprocessContainer(container) {
    container.id = container.barcode;
    delete container.barcode;
    return container;
}
