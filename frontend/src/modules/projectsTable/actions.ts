import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectProjectsTable } from "../../selectors"
import { list as listProjects } from '../projects/actions'
import { actionTypes } from "./reducers"

const actions = createPagedItemsActions(actionTypes, selectProjectsTable, listProjects)

export default actions