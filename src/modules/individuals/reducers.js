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
                didInvalidate: false,
                lastUpdated: action.receivedAt
            };
        case FETCH_INDIVIDUALS.FINISH:
            return {
                ...state,
                isFetching: false
            };
        default:
            return state;
    }
};
