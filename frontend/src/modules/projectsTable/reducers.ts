import { createPagedItems } from '../../models/paged_items'
import { createPagedItemsReducer } from '../../models/paged_items_factory'

export const PREFIX = 'PROJECTS_TABLE'
const initialState = createPagedItems()

export const projectsTable = createPagedItemsReducer(PREFIX, initialState)
