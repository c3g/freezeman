import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectProjectsOfSamples } from "../../selectors"
import { actionTypes } from "./reducers"
import { list as listProjects } from '../projects/actions'

const actions = createPagedItemsActions(actionTypes, selectProjectsOfSamples, listProjects)

export default actions