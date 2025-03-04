import { createPagedItems } from "../../models/paged_items"
import { createPagedItemsReducer } from "../../models/paged_items_factory"

export const PREFIX = 'USERS_TABLE'
const initialState = createPagedItems()
export const usersTable = createPagedItemsReducer(PREFIX, initialState)