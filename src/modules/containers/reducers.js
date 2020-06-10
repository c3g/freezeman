import { merge, set } from "object-path-immutable";
import {objectsByProperty} from "../../utils/objects";

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
        itemsByBarcode: {},
        page: { previous: null, next: null },
        totalCount: null,
        isFetching: false,
        isFetchingBarcodes: [],
    },
    action
) => {
    switch (action.type) {
        case CONTAINERS.LIST.REQUEST:
            return { ...state, isFetching: true };
        case CONTAINERS.LIST.RECEIVE:
            return {
                ...state,
                itemsByBarcode: objectsByProperty(action.data.results, "barcode"),
                page: { previous: action.data.previous, next: action.data.next },
                totalCount: action.data.count,
                isFetching: false,
            };
        case CONTAINERS.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error };

        case CONTAINERS.GET.REQUEST:
            return {
                ...state,
                isFetchingBarcodes: [...state.isFetchingBarcodes, action.params.barcode],
            };
        case CONTAINERS.GET.RECEIVE: {
            return {
                ...state,
                itemsByBarcode: set(state.itemsByBarcode, [action.params.barcode], action.data),
                isFetchingBarcodes: state.isFetchingBarcodes.filter(b => b !== action.params.barcode),
            };
        }
        case CONTAINERS.GET.ERROR:
            return {
                ...state,
                isFetchingBarcodes: state.isFetchingBarcodes.filter(b => b !== action.params.barcode),
                error: action.error,
            };

        default:
            return state;
    }
};
