import {merge} from "object-path-immutable";
import {map} from "rambda"

import {indexByID} from "../../utils/objects";

import IMPORTEDFILES from "./actions";

export const importedFiles = (
    state = {
        itemsByID: {},
        items: [],
        page: { offset: 0 },
        totalCount: 0,
        isFetching: false,
        filters: {},
        sortBy: { key: undefined, order: undefined },
    },
    action
) => {
    switch (action.type) {

        case IMPORTEDFILES.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case IMPORTEDFILES.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case IMPORTEDFILES.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
              { error: action.error, isFetching: false, didFail: true });

        case IMPORTEDFILES.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case IMPORTEDFILES.LIST.RECEIVE: {
            const results = action.data.results.map(preprocess)
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case IMPORTEDFILES.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };
        
        case IMPORTEDFILES.DOWNLOAD.REQUEST:
            return { ...state, error: undefined, isFetching: true };
        case IMPORTEDFILES.DOWNLOAD.RECEIVE:
            return { ...state, isFetching: false, items: action.data, };
        case IMPORTEDFILES.DOWNLOAD.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        default:
            return state;
    }
};

function preprocess(importedFile) {
    importedFile.isFetching = false;
    importedFile.isLoaded = true;
    return importedFile
}
