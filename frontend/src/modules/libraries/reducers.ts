import { merge } from "object-path-immutable"

import { indexByID } from "../../utils/objects"
import { prefillTemplatesReducerFactory } from "../../utils/prefillTemplates"
import { summaryReducerFactory } from "../../utils/summary"
import { templateActionsReducerFactory } from "../../utils/templateActions"

import LIBRARIES from "./actions"

export const librariesSummary = summaryReducerFactory(LIBRARIES);
export const libraryTemplateActions = templateActionsReducerFactory(LIBRARIES);
export const libraryPrefillTemplates = prefillTemplatesReducerFactory(LIBRARIES);

export const libraries = (
    state = {
        itemsByID: {},
        items: [],
        filteredItems: [],
        page: { offset: 0 },
        totalCount: 0,
        filteredItemsCount: 0,
        isFetching: false,
        filters: {},
        sortBy: { key: undefined, order: undefined },
    },
    action
) => {
    switch (action.type) {

        case LIBRARIES.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case LIBRARIES.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case LIBRARIES.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
              { error: action.error, isFetching: false, didFail: true });

        case LIBRARIES.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case LIBRARIES.LIST.RECEIVE: {
            /* libraries[].container stored in ../containers/reducers.js */
            const results = action.data.results.map(preprocess)
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case LIBRARIES.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        default:
            return state;
    }
};

function preprocess(library) {
    library.isFetching = false;
    library.isLoaded = true;
    return library
}
