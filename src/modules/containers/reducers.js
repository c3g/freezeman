import {objectsByProperty} from "../../utils/objects";

import CONTAINERS from "./actions";

export const containerKinds = (
    state = {
        items: [],
        itemsByID: {},
        isFetching: false,
        lastUpdated: null,
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
                lastUpdated: action.receivedAt,
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
        items: [],
        itemsByBarcode: {},
        serverCount: 0,  // For pagination
        isFetching: false,
        isFetchingBarcodes: [],
        didInvalidate: false,
        lastUpdated: null,
    },
    action
) => {
    switch (action.type) {
        case CONTAINERS.LIST.REQUEST:
            return {
                ...state,
                isFetching: true,
            };
        case CONTAINERS.LIST.RECEIVE:
            return {
                ...state,
                items: action.data,
                itemsByBarcode: objectsByProperty(action.data, "barcode"),
                serverCount: action.data.length,
                isFetching: false,
                didInvalidate: false,
                lastUpdated: action.receivedAt,
            };
        case CONTAINERS.LIST.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error,
            };

        case CONTAINERS.GET.REQUEST:
            return {
                ...state,
                isFetchingBarcodes: [...state.isFetchingBarcodes, action.params.barcode],
            };
        case CONTAINERS.GET.RECEIVE: {
            const items = [...state.items.filter(c => c.barcode !== action.params.barcode), action.data];
            return {
                ...state,
                items,
                itemsByBarcode: {
                    ...state.itemsByBarcode,
                    [action.params.barcode]: action.data,
                },
                serverCount: items.length,
                isFetchingBarcodes: state.isFetchingBarcodes.filter(b => b !== action.params.barcode),
            };
        }
        case CONTAINERS.GET.ERROR:
            return {
                ...state,
                // TODO: Update server count here instead?
                isFetchingBarcodes: state.isFetchingBarcodes.filter(b => b !== action.params.barcode),
                error: action.error,
            };

        default:
            return state;
    }
};
