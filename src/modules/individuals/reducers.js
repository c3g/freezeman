import {FETCH_INDIVIDUALS} from "./actions";
import {objectsByProperty} from "../../utils/objects";

export const individuals = (
    state = {
        items: [],
        itemsByName: {},
        serverCount: 0,  // For pagination
        isFetching: false,
        didInvalidate: false,
        lastUpdated: null,
    },
    action
) => {
    switch (action.type) {
        case FETCH_INDIVIDUALS.REQUEST:
            return {
                ...state,
                isFetching: true
            };
        case FETCH_INDIVIDUALS.RECEIVE:
            return {
                ...state,
                items: action.data,
                itemsByName: objectsByProperty(action.data, "name"),
                serverCount: action.data.length,
                isFetching: false,
                didInvalidate: false,
                lastUpdated: action.receivedAt
            };
        case FETCH_INDIVIDUALS.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error,
            };
        default:
            return state;
    }
};
