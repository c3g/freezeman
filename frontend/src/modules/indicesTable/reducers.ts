import { createPagedItems } from "../../models/paged_items"
import { createPagedItemsReducer } from "../../models/paged_items_factory"


export const PREFIX = 'INDICES_TABLE'
const initialState = createPagedItems()
export const indicesTable = createPagedItemsReducer(PREFIX, initialState)
