import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectInstrumentsTable } from "../../selectors"
import { listInstruments } from "../experimentRuns/actions"
import { PREFIX } from "./reducers"

const actions = createPagedItemsActions(PREFIX, selectInstrumentsTable, listInstruments)

export default actions  