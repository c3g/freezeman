import { createPagedItems } from '../../models/paged_items'
import { createPagedItemsReducer } from '../../models/paged_items_factory'

export const PREFIX = 'PROJECT_SAMPLES_TABLE'

export const projectSamplesTable = createPagedItemsReducer(PREFIX, createPagedItems())