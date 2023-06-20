import { selectProjectsState } from "../../selectors"
import api from "../../utils/api"
import { createPagedItemsActionTypes, createPagedItemsActions } from "../../models/paged_items_factory";
import { networkAction } from "../../utils/actions"
import { LIST } from "../../modules/projects/actions"





const actionTypes = createPagedItemsActionTypes('PROJECTS')
const actions = createPagedItemsActions(actionTypes, selectProjectsState, api.projects.list)

export default actions