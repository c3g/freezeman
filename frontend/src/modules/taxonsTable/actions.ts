import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectTaxonsTable } from "../../selectors"
import { actionTypes } from "./reducers"
import { list as listTaxons } from '../taxons/actions'

const actions = createPagedItemsActions(actionTypes, selectTaxonsTable, listTaxons)

export default actions