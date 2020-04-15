import {INVALIDATE_AUTH, PERFORM_AUTH, REFRESH_AUTH_TOKEN} from "./actions";

export const auth = (
    state = {
        tokens: {
            access: null,
            refresh: null,
        },
        isFetching: false,
        didInvalidate: false,
        lastUpdated: null,
    },
    action
) => {
    switch (action.type) {
        case INVALIDATE_AUTH:
            return {
                ...state,
                didInvalidate: true,  // TODO: Just set access/refresh to null?
            };

        case PERFORM_AUTH.REQUEST:
            return {
                ...state,
                isFetching: true,
            };
        case PERFORM_AUTH.RECEIVE:
            return {
                ...state,
                tokens: action.data,
                didInvalidate: false,
                lastUpdated: action.receivedAt,
            };
        case PERFORM_AUTH.FINISH:
            return {
                ...state,
                isFetching: false,
            };

        case REFRESH_AUTH_TOKEN.REQUEST:
            return {
                ...state,
                isFetching: true,
            };
        case REFRESH_AUTH_TOKEN.RECEIVE:
            return {
                ...state,
                tokens: {
                    ...state.tokens,
                    ...action.data,
                },
                didInvalidate: false,  // TODO: Should this be reset here?
                lastUpdated: action.receivedAt,
            };
        case REFRESH_AUTH_TOKEN.FINISH:
            return {
                ...state,
                isFetching: false,
            };

        default:
            return state;
    }
};
