import { createPagedItems } from '../../models/paged_items'
import { createPagedItemsReducer } from '../../models/paged_items_factory'

export const PREFIX = 'LIBRARIES_TABLE'
const initialState = createPagedItems()

export const librariesTable = createPagedItemsReducer(PREFIX, initialState)