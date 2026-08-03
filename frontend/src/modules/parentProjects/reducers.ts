import { merge } from "object-path-immutable"

import { indexByID } from "../../utils/objects"

import { AnyAction } from "redux"
import { ItemsByID, ParentProject } from "../../models/frontend_models"
import PARENT_PROJECTS from "./actions"

interface ParentProjectsState {
    itemsByID: ItemsByID<ParentProject>
    isFetching: boolean
    error?: any
}
const initialState: ParentProjectsState = {
    itemsByID: {},
    isFetching: false
}

export const parentProjects = (
    state: ParentProjectsState = initialState,
    action : AnyAction
) => {
    switch (action.type) {

        case PARENT_PROJECTS.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case PARENT_PROJECTS.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case PARENT_PROJECTS.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
              { error: action.error, isFetching: false, didFail: true });

        case PARENT_PROJECTS.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case PARENT_PROJECTS.LIST.RECEIVE: {
            const results = action.data.results.map(preprocess)
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case PARENT_PROJECTS.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        default: return state
    }
};

function preprocess(parentProject: ParentProject) {
    parentProject.isFetching = false;
    parentProject.isLoaded = true;
    return parentProject
}