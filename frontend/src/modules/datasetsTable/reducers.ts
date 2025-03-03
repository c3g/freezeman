import { createPagedItems } from "../../models/paged_items"
import { createPagedItemsActionTypes, createPagedItemsReducer } from "../../models/paged_items_factory"

export const PREFIX = 'DATASETS_TABLE'
const initialState = createPagedItems()

export const datasetsTable = createPagedItemsReducer(actionTypes, initialState)