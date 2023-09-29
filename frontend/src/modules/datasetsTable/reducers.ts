import { createPagedItems } from "../../models/paged_items"
import { createPagedItemsActionTypes, createPagedItemsReducer } from "../../models/paged_items_factory"

export const actionTypes = createPagedItemsActionTypes('DATASETS_TABLE')
const initialState = createPagedItems()

export const datasetsTable = createPagedItemsReducer(actionTypes, initialState)