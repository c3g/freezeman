import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectInstrumentsTable } from "../../selectors"
import { listInstruments } from "../experimentRuns/actions"
import { actionTypes } from "./reducers"

const actions = createPagedItemsActions(actionTypes, selectInstrumentsTable, listInstruments)

export default actions  