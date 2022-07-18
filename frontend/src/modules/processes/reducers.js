import PROCESSES from "./actions";
import { indexByID } from "../../utils/objects";
import {merge} from "object-path-immutable";

export const processes = (
    state = {
        items: [],
        itemsByID: {},
        isFetching: false,
    },
    action
) => {
    switch (action.type) {
        case PROCESSES.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case PROCESSES.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case PROCESSES.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id], { error: action.error, isFetching: false, didFail: true });

        case PROCESSES.LIST.REQUEST:
            return {
                ...state,
                isFetching: true,
            };
        case PROCESSES.LIST.RECEIVE:
            return {
                ...state,
                items: action.data,
                itemsByID: indexByID(action.data, "id"),
                isFetching: false,
            };
        case PROCESSES.LIST.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error,
            };

        default:
            return state;
    }
};