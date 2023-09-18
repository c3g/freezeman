import { merge } from "object-path-immutable";

import { indexByID } from "../../utils/objects";
import { summaryReducerFactory } from "../../utils/summary";
import { templateActionsReducerFactory } from "../../utils/templateActions";

import INDICES from "./actions";

export const indicesSummary = summaryReducerFactory(INDICES);
export const indicesTemplateActions = templateActionsReducerFactory(INDICES);

export const indices = (
    state = {
        itemsByID: {},
        isFetching: false,
    },
    action
) => {
    switch (action.type) {

        case INDICES.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case INDICES.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case INDICES.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
              { error: action.error, isFetching: false, didFail: true });

        case INDICES.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case INDICES.LIST.RECEIVE: {
            const results = action.data.results.map(preprocess)
            const itemsByID = merge(state.itemsByID, [], indexByID(results, "id"));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case INDICES.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        case INDICES.VALIDATE.REQUEST:
            return { ...state, error: undefined, isFetching: true };
        case INDICES.VALIDATE.RECEIVE:
            return {...state, isFetching: false };
        case INDICES.VALIDATE.ERROR:
            return { ...state, error: action.error, isFetching: false };

        default:
            return state
    }
};

function preprocess(index) {
    index.isFetching = false;
    index.isLoaded = true;
    return index
}
