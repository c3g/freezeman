import { createPagedItems } from "../../models/paged_items"
import { createPagedItemsReducer } from "../../models/paged_items_factory"

const initialState = createPagedItems()
export const PREFIX = 'EXPERIMENT_RUNS_TABLE'
export const experimentRunsTable = createPagedItemsReducer(PREFIX, initialState)