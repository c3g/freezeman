import { createPagedItems } from '../../models/paged_items'
import { createPagedItemsReducer } from '../../models/paged_items_factory'

const initialState = createPagedItems()
export const PREFIX = 'READSETS_TABLE'
export const readsetsTable = createPagedItemsReducer(PREFIX, initialState)