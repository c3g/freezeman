import {FETCH_USERS} from "./actions";
import {objectsByProperty} from "../../utils/objects";

export const users = (
    state = {
        items: [],
        itemsByID: {},
        isFetching: false,
        didInvalidate: false,
        lastUpdated: null,
    },
    action
) => {
    switch (action.type) {
        case FETCH_USERS.REQUEST:
            return {
                ...state,
                isFetching: true
            };
        case FETCH_USERS.RECEIVE:
            return {
                ...state,
                items: action.data,
                itemsByID: objectsByProperty(action.data, "id"),
                didInvalidate: false,
                lastUpdated: action.receivedAt
            };
        case FETCH_USERS.FINISH:
            return {
                ...state,
                isFetching: false
            };
        default:
            return state;
    }
};
