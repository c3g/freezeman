
import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectDatasetsTable } from "../../selectors"
import { list as listDatasets } from '../datasets/actions'
import { PREFIX } from "./reducers"

const actions = createPagedItemsActions(PREFIX, selectDatasetsTable, listDatasets)

export default actions