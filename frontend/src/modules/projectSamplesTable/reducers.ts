import { AnyAction, Reducer, combineReducers } from 'redux'
import { Project } from '../../models/frontend_models'
import { PagedItems, createPagedItems } from '../../models/paged_items'
import { createPagedItemsActionTypes, createPagedItemsReducer } from '../../models/paged_items_factory'

const ACTION_PREFIX = 'PROJECT_SAMPLES_TABLE'

export const actionTypes = {
    ...createPagedItemsActionTypes(ACTION_PREFIX),
    SET_PROJECT: `${ACTION_PREFIX}.SET_PROJECT`
}

export interface ProjectSamplesTable {
    projectID: Project['id'] | null
    pagedItems: PagedItems
}

interface ProjectSamplesTableReducers {
    projectID: Reducer<ProjectSamplesTable['projectID'], AnyAction>
    pagedItems: Reducer<ProjectSamplesTable['pagedItems'], AnyAction>
}

export const projectSamplesTable = combineReducers({
    projectID: (state = null, action) => {
        if (action.type === actionTypes.SET_PROJECT) {
            return action.projectID
        }
        return state
    },
    pagedItems: createPagedItemsReducer(actionTypes, createPagedItems())
} as ProjectSamplesTableReducers)
