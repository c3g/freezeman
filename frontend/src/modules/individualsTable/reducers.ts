import { createPagedItems } from '../../models/paged_items'
import { createPagedItemsActionTypes, createPagedItemsReducer } from '../../models/paged_items_factory'

export const actionTypes = createPagedItemsActionTypes('INDIVIDUALS_TABLE')
const initialState = createPagedItems()

export const individualsTable = createPagedItemsReducer(actionTypes, initialState)
