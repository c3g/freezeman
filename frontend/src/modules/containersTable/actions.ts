import { selectContainersTable } from "../../selectors"
import { PREFIX } from "./reducers"
import { createPagedItemsActions } from "../../models/paged_items_factory"
import { list as listContainers } from '../containers/actions'

const actions = createPagedItemsActions(PREFIX, selectContainersTable, listContainers)

export default actions