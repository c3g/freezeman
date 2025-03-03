import { createPagedItems } from '../../models/paged_items'
import { createPagedItemsActionTypes, createPagedItemsReducer } from '../../models/paged_items_factory'

export const PREFIX = 'SAMPLES_TABLE'
const initialState = createPagedItems()

export const samplesTable = createPagedItemsReducer(actionTypes, initialState)
