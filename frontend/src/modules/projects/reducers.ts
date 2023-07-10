import { merge } from "object-path-immutable"

import { indexByID } from "../../utils/objects"
import { resetTable } from "../../utils/reducers"
import { summaryReducerFactory } from "../../utils/summary"
import { templateActionsReducerFactory } from "../../utils/templateActions"

import { AnyAction } from "redux"
import { ItemsByID, Project } from "../../models/frontend_models"
import PROJECTS from "./actions"

export const projectsSummary = summaryReducerFactory(PROJECTS);
export const projectTemplateActions = templateActionsReducerFactory(PROJECTS);

interface ProjectsState {
    itemsByID: ItemsByID<Project>
    isFetching: boolean
    error?: any
}
const initialState: ProjectsState = {
    itemsByID: {},
    isFetching: false
}

export const projects = (
    state: ProjectsState = initialState,
    action : AnyAction
) => {
    switch (action.type) {

        case PROJECTS.GET.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case PROJECTS.GET.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false });
        case PROJECTS.GET.ERROR:
            return merge(state, ['itemsByID', action.meta.id],
              { error: action.error, isFetching: false, didFail: true });

        case PROJECTS.ADD.REQUEST:
            return { ...state, error: undefined, isFetching: true };
        case PROJECTS.ADD.RECEIVE:
            return merge(resetTable({ ...state, isFetching: false, }), ['itemsByID', action.data.id],
                preprocess(action.data));
        case PROJECTS.ADD.ERROR:
            return { ...state, error: action.error, isFetching: false };

        case PROJECTS.UPDATE.REQUEST:
            return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
        case PROJECTS.UPDATE.RECEIVE:
            return merge(state, ['itemsByID', action.meta.id], { ...action.data, isFetching: false, versions: undefined });
        case PROJECTS.UPDATE.ERROR:
            return merge(state, ['itemsByID', action.meta.id], { error: action.error, isFetching: false });

        case PROJECTS.LIST.REQUEST:
            return { ...state, isFetching: true, };
        case PROJECTS.LIST.RECEIVE: {
            const results = action.data.results.map(preprocess)
            const itemsByID = merge(state.itemsByID, [], indexByID(results));
            return { ...state, itemsByID, isFetching: false, error: undefined };
        }
        case PROJECTS.LIST.ERROR:
            return { ...state, isFetching: false, error: action.error, };

        default: return state
    }
};

function preprocess(project) {
    project.isFetching = false;
    project.isLoaded = true;
    return project
}
