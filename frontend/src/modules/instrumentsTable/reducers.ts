import { createPagedItems } from "../../models/paged_items"
import { createPagedItemsActionTypes, createPagedItemsReducer } from "../../models/paged_items_factory"

const initialState = createPagedItems()
export const actionTypes = createPagedItemsActionTypes('INSTRUMENTS_TABLE')
export const instrumentsTable = createPagedItemsReducer(actionTypes, initialState)