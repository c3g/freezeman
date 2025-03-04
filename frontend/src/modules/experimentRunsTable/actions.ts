
import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectExperimentRunsTable } from "../../selectors"
import { list } from '../experimentRuns/actions'
import { PREFIX } from "./reducers"

const actions = createPagedItemsActions(PREFIX, selectExperimentRunsTable, list)
export default actions