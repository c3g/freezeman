import { createPagedItemsReducer } from '../../models/paged_items_factory'

export const PREFIX = 'CONTAINERS_TABLE'

export const containersTable = createPagedItemsReducer(PREFIX)
