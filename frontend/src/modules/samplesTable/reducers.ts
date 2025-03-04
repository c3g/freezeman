import { createPagedItems } from '../../models/paged_items'
import { createPagedItemsReducer } from '../../models/paged_items_factory'

export const PREFIX = 'SAMPLES_TABLE'
const initialState = createPagedItems()

export const samplesTable = createPagedItemsReducer(PREFIX, initialState)
