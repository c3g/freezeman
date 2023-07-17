import { createPagedItems } from '../../models/paged_items'
import { createPagedItemsActionTypes, createPagedItemsReducer } from '../../models/paged_items_factory'

export const actionTypes = createPagedItemsActionTypes('PROJECT_SAMPLES_TABLE')
const initialState = createPagedItems()

export const projectSamplesTable = createPagedItemsReducer(actionTypes, initialState)
