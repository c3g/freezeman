import { createPagedItems } from "../../models/paged_items"
import { createPagedItemsActionTypes, createPagedItemsReducer } from "../../models/paged_items_factory"

export const PROJECTS_OF_SAMPLES_PREFIX = 'PROJECTS_OF_SAMPLES'
export const actionTypes = createPagedItemsActionTypes(PROJECTS_OF_SAMPLES_PREFIX)

const initialState = createPagedItems()

export const projectsOfSamples = createPagedItemsReducer(actionTypes, initialState)