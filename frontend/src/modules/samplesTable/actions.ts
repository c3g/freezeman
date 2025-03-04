import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectSamplesTable } from "../../selectors"
import { list as listSamples } from '../samples/actions'
import { PREFIX } from "./reducers"

const actions = createPagedItemsActions(PREFIX, selectSamplesTable, (option) => listSamples(option, true))

export default actions