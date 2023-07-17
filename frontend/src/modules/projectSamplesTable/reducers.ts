import { AnyAction, Reducer } from 'redux'
import { Project } from '../../models/frontend_models'
import { PagedItems, createPagedItems } from '../../models/paged_items'
import { createPagedItemsActionTypes, createPagedItemsReducer } from '../../models/paged_items_factory'

const ACTION_PREFIX = 'PROJECT_SAMPLES_TABLE'

export const actionTypes = {
    ...createPagedItemsActionTypes('PROJECT_SAMPLES_TABLE'),
    SET_PROJECT: `${ACTION_PREFIX}.SET_PROJECT`
}
const initialState = createPagedItems()

export interface ProjectSamplesTable extends PagedItems {
    projectID?: Project['id']
}

export const projectSamplesTable: Reducer<ProjectSamplesTable, AnyAction> = (state: ProjectSamplesTable = initialState, action: AnyAction): ProjectSamplesTable => {
    switch(action.type) {
        case actionTypes.SET_PROJECT: {
            return {
                ...state,
                projectID: action.projectID
            }
        }
        default: {
            return createPagedItemsReducer(actionTypes, initialState)(state, action)
        }
    }
}
