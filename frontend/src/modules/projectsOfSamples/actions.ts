import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectProjectsOfSamples } from "../../selectors"
import api from '../../utils/api'
import { actionTypes } from "./reducers"

const actions = createPagedItemsActions(actionTypes, selectProjectsOfSamples, api.projects.list)

export default actions