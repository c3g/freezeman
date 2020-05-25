import {objectsByProperty} from "../../utils/objects";
import {FETCH_SAMPLES} from "./actions";

export const samples = (
    state = {
        items: [],
        itemsByID: {},
        serverCount: 0,  // For pagination
        isFetching: false,
        didInvalidate: false,
        lastUpdated: null,
    },
    action
) => {
    switch (action.type) {
        case FETCH_SAMPLES.REQUEST:
            return {
                ...state,
                isFetching: true,
            };
        case FETCH_SAMPLES.RECEIVE:
            return {
                ...state,
                items: action.data,
                itemsByID: objectsByProperty(action.data, "id"),
                serverCount: action.data.length,
                isFetching: false,
                didInvalidate: false,
                lastUpdated: action.receivedAt,
            };
        case FETCH_SAMPLES.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error,
            };
        default:
            return state;
    }
};
