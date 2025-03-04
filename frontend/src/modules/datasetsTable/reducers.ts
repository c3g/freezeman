import { createPagedItems } from "../../models/paged_items"
import { createPagedItemsReducer } from "../../models/paged_items_factory"

export const PREFIX = 'DATASETS_TABLE'
const initialState = createPagedItems()

export const datasetsTable = createPagedItemsReducer(PREFIX, initialState)