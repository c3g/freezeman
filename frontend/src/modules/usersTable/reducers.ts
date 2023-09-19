import { createPagedItems } from "../../models/paged_items"
import { createPagedItemsActionTypes, createPagedItemsReducer } from "../../models/paged_items_factory"

export const actionTypes = createPagedItemsActionTypes('USERS_TABLE')
const initialState = createPagedItems()
export const usersTable = createPagedItemsReducer(actionTypes, initialState)