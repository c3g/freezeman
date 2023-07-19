import { AnyAction, Reducer, combineReducers } from 'redux'
import { Project } from '../../models/frontend_models'
import { PagedItems, createPagedItems } from '../../models/paged_items'
import { createPagedItemsActionTypes, createPagedItemsReducer } from '../../models/paged_items_factory'

type ActionPrefix = 'PROJECT_SAMPLES_TABLE'
const ACTION_PREFIX: ActionPrefix = 'PROJECT_SAMPLES_TABLE'

export interface ProjectsSamplesTableActionTypes<Prefix extends string> extends ReturnType<typeof createPagedItemsActionTypes<Prefix>> {
    SET_PROJECT: `${ActionPrefix}.SET_PROJECT`
}

export const actionTypes: ProjectsSamplesTableActionTypes<ActionPrefix> = {
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
