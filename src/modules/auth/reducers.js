import {LOG_OUT, PERFORM_AUTH, REFRESH_AUTH_TOKEN} from "./actions";

const initialState = {
    isFetching: false,
    didInvalidate: false,
    currentUserID: null,
    tokens: {
        access: null,
        refresh: null,
    },
};

export const auth = (
    state = initialState,
    action
) => {
    switch (action.type) {
        case LOG_OUT:
            return initialState;

        case PERFORM_AUTH.REQUEST:
            return {
                ...state,
                isFetching: true,
            };
        case PERFORM_AUTH.RECEIVE:
            return {
                ...state,
                tokens: action.data.tokens,
                currentUserID: action.data.currentUserID,
                isFetching: false,
            };
        case PERFORM_AUTH.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error,
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
                isFetching: false,
            };
        case REFRESH_AUTH_TOKEN.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error,
            };

        default:
            return state;
    }
};
