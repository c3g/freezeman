import { merge, set } from "object-path-immutable";
import VERSIONS from "./actions";

const initialState = {
    samples: {
        isFetching: false,
        isLoaded: false,
        items: [],
        error: undefined,
    },
};

export const versions = (state = initialState, action) => {
    switch (action.type) {

        case VERSIONS.FETCH_SAMPLES.REQUEST:
            return set(state, ["samples", "isFetching"], true)
        case VERSIONS.FETCH_SAMPLES.RECEIVE:
            return merge(state, ["samples"], {
                isFetching: false,
                isLoaded: true,
                items: action.data,
            })
        case VERSIONS.FETCH_SAMPLES.ERROR:
            return merge(state, ["samples"], {
                isFetching: false,
                error: action.error,
            });

        default:
            return state;
    }
};
