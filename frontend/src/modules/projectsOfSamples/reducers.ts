import { createPagedItems } from "../../models/paged_items"
import { createPagedItemsReducer } from "../../models/paged_items_factory"

export const PREFIX = 'PROJECTS_OF_SAMPLES'

const initialState = createPagedItems()

export const projectsOfSamples = createPagedItemsReducer(PREFIX, initialState)