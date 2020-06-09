import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import {constVal} from "../../utils/functions";

export const LIST_KINDS = createNetworkActionTypes("CONTAINERS.LIST_KINDS");
export const LIST = createNetworkActionTypes("CONTAINERS.LIST");
export const GET = createNetworkActionTypes("CONTAINERS.GET");

const _listKinds = networkAction(LIST_KINDS, constVal("/container-kinds/"));
export const listKinds = () => async (dispatch, getState) => {
    // Check if we're already fetching or have fetched container kinds first (they won't change dynamically.)
    if (getState().containerKinds.isFetching || getState().containerKinds.items.length > 0) return;
    await dispatch(_listKinds());
}

const _list = networkAction(LIST, constVal("/containers/"));
export const list = () => async (dispatch, getState) => {
    if (getState().containers.isFetching) return;
    // TODO: Account for pagination
    if (!getState().containers.didInvalidate && getState().containers.items.length > 0) return;
    await dispatch(_list());
};

// TODO: Track errored responses to avoid spam
const _get = networkAction(GET, ({barcode}) => `/containers/${barcode}/`);
export const get = barcode => async (dispatch, getState) => {
    if (!barcode
            || getState().containers.isFetching
            || barcode in getState().containers.itemsByBarcode
            || getState().containers.isFetchingBarcodes.includes(barcode)) {
        return;
    }
    await dispatch(_get(undefined, {barcode}));
};

export default {
    GET,
    LIST,
    LIST_KINDS,
    get,
    list,
    listKinds,
}
