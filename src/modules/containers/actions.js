import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api"

export const LIST_KINDS = createNetworkActionTypes("CONTAINERS.LIST_KINDS");
export const LIST = createNetworkActionTypes("CONTAINERS.LIST");
export const GET = createNetworkActionTypes("CONTAINERS.GET");

export const listKinds = () => async (dispatch, getState) => {
    // Check if we're already fetching or have fetched container kinds first (they won't change dynamically.)
    if (getState().containerKinds.isFetching || getState().containerKinds.items.length > 0)
        return;

    await dispatch(networkAction(LIST_KINDS, api.containerKinds.list()));
}

export const list = () => async (dispatch, getState) => {
    if (getState().containers.isFetching)
        return;

    await dispatch(networkAction(LIST, api.containers.list()));
};

// TODO: Track errored responses to avoid spam
export const get = barcode => async (dispatch, getState) => {
    if (!barcode
            || getState().containers.isFetching
            || barcode in getState().containers.itemsByBarcode
            || getState().containers.isFetchingBarcodes.includes(barcode)) {
        return;
    }

    await dispatch(networkAction(GET, api.containers.get(barcode), { meta: { barcode } }));
};

export default {
    GET,
    LIST,
    LIST_KINDS,
    get,
    list,
    listKinds,
}
