import { createPagedItemsActionTypes, createPagedItemsActions } from "../../models/paged_items_factory"
import { list as listProjects } from '../../modules/projects/actions'
import { selectProjectsState } from "../../selectors"
const actionTypes = createPagedItemsActionTypes('PROJECTS_TABLE')
const actions = createPagedItemsActions(actionTypes, selectProjectsState, listProjects)

export default actions