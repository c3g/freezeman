import { createPagedItems } from "../../models/paged_items"
import { createPagedItemsActionTypes, createPagedItemsReducer } from "../../models/paged_items_factory"

const initialState = createPagedItems()
export const actionTypes = createPagedItemsActionTypes('EXPERIMENT_RUNS_TABLE')
export const experimentRunsTable = createPagedItemsReducer(actionTypes, initialState)