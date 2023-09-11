import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectSamplesTable } from "../../selectors"
import { list as listSamples } from '../samples/actions'
import { actionTypes } from "./reducers"

const actions = createPagedItemsActions(actionTypes, selectSamplesTable, listSamples)

export default actions