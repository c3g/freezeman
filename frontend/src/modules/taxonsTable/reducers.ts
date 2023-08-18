import { createPagedItems } from "../../models/paged_items"
import { createPagedItemsActionTypes, createPagedItemsReducer } from "../../models/paged_items_factory"

export const TAXONS_TABLE_PREFIX = 'TAXONS_TABLE'
export const actionTypes = createPagedItemsActionTypes(TAXONS_TABLE_PREFIX)

const initialState = createPagedItems(undefined, 10)

export const taxonsTable = createPagedItemsReducer(actionTypes, initialState)
