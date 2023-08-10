import { createPagedItems } from '../../models/paged_items'
import { createPagedItemsActionTypes, createPagedItemsReducer } from '../../models/paged_items_factory'

export const actionTypes = createPagedItemsActionTypes('PROJECTS_TABLE')
const initialState = createPagedItems()

export const projectsTable = createPagedItemsReducer(actionTypes, initialState)
