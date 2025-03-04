import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectReadsetsTable } from "../../selectors"
import { listWithMetrics as listReadsets} from "../readsets/actions"
import { PREFIX } from "./reducers"

const actions = createPagedItemsActions(PREFIX, selectReadsetsTable, listReadsets)

export default actions