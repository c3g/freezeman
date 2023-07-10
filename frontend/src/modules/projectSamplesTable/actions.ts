import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectProjectSamplesTable } from "../../selectors"
import { list as listSamples } from '../samples/actions'
import { actionTypes } from "./reducers"

const actions = createPagedItemsActions(actionTypes, selectProjectSamplesTable, listSamples)

export default actions