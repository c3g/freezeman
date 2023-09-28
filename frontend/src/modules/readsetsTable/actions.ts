import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectReadsetsTable } from "../../selectors"
import { listWithMetrics as listReadsets} from "../readsets/actions"
import { actionTypes } from "./reducers"

const actions = createPagedItemsActions(actionTypes, selectReadsetsTable, listReadsets)

export default actions