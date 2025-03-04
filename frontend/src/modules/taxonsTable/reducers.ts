import { createPagedItems } from "../../models/paged_items"
import { createPagedItemsReducer } from "../../models/paged_items_factory"

export const PREFIX = 'TAXONS_TABLE'

const initialState = createPagedItems()

export const taxonsTable = createPagedItemsReducer(PREFIX, initialState)
