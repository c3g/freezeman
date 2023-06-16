import { selectProjectsState } from "../../selectors"
import api from "../../utils/api"
import { createPagedItemsActionTypes, createPagedItemsActions } from "../../models/paged_items_factory";

const actionTypes = createPagedItemsActionTypes('PROJECTS')
const actions = createPagedItemsActions(actionTypes, selectProjectsState, api.projects.list)

export default actions