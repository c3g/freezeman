
import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectExperimentRunsTable } from "../../selectors"
import { list } from '../experimentRuns/actions'
import { actionTypes } from "./reducers"

const actions = createPagedItemsActions(actionTypes, selectExperimentRunsTable, list)
export default actions