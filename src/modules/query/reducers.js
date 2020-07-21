import QUERY from "./actions";

const initialState = {
    isFetching: false,
    items: [],
    error: undefined,
};

export const query = (state = initialState, action) => {
    switch (action.type) {
        case QUERY.CLEAR:
            return initialState;

        case QUERY.SEARCH.REQUEST:
            return { ...state, isFetching: true };
        case QUERY.SEARCH.RECEIVE:
            return {
                ...state,
                isFetching: false,
                items: action.data,
            };
        case QUERY.SEARCH.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        default:
            return state;
    }
};
