import { indexByID } from "../../utils/objects";
import BIOSAMPLES from "./actions"
import { merge } from "object-path-immutable"

export const biosamples = (
    state = {
        itemsByID: {},
        items: [],
        isFetching: false,
    }
    ,
    action) => {
    switch (action.type) {
        case BIOSAMPLES.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case BIOSAMPLES.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case BIOSAMPLES.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
                { error: action.error, isFetching: false, didFail: true });
        case BIOSAMPLES.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case BIOSAMPLES.LIST.RECEIVE: {
            const itemsByID = merge(state.itemsByID, [], indexByID(action.data.results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case BIOSAMPLES.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };
    }
    return state;
}