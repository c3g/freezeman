
import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectDatasetsTable } from "../../selectors"
import { list as listDatasets } from '../datasets/actions'
import { actionTypes } from "./reducers"

const actions = createPagedItemsActions(actionTypes, selectDatasetsTable, listDatasets)

export default actions