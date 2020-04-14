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
                didInvalidate: false,
                lastUpdated: action.receivedAt,
            };
        case FETCH_SAMPLES.FINISH:
            return {
                ...state,
                isFetching: false,
            };
        default:
            return state;
    }
};
