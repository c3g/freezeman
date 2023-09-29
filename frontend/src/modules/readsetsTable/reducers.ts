import { createPagedItems } from '../../models/paged_items'
import { createPagedItemsActionTypes, createPagedItemsReducer } from '../../models/paged_items_factory'

const initialState = createPagedItems()
export const actionTypes = createPagedItemsActionTypes('READSETS_TABLE')
export const readsetsTable = createPagedItemsReducer(actionTypes, initialState)