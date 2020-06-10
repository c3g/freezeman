import { merge, set } from "object-path-immutable";

import preprocessVersions from "../../utils/preprocessVersions";
import {objectsByProperty} from "../../utils/objects";
import SAMPLES from "./actions";

export const samples = (
    state = {
        itemsByID: {},
        totalCount: 0,  // For pagination
        isFetching: false,
    },
    action
) => {
    switch (action.type) {

        case SAMPLES.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case SAMPLES.LIST.RECEIVE:
            return {
                ...state,
                itemsByID: objectsByProperty(action.data.results, "id"),
                totalCount: action.data.count,
                isFetching: false,
            };
        case SAMPLES.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        case SAMPLES.LIST_VERSIONS.REQUEST:
            return set(state, ['itemsByID', action.params.id, 'isFetching'], true);
        case SAMPLES.LIST_VERSIONS.RECEIVE:
            return merge(state, ['itemsByID', action.params.id], {
                isFetching: false,
                versions: preprocessVersions(action.data),
            });
        case SAMPLES.LIST_VERSIONS.ERROR:
            return merge(state, ['itemsByID', action.params.id], {
                isFetching: false,
                versions: [],
                error: action.error,
            });

        default:
            return state;
    }
};
