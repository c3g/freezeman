import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectTaxonsTable } from "../../selectors"
import { PREFIX } from "./reducers"
import { list as listTaxons } from '../taxons/actions'

const actions = createPagedItemsActions(PREFIX, selectTaxonsTable, listTaxons)

export default actions