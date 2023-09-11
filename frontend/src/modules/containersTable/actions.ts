import { selectContainersTable } from "../../selectors"
import { actionTypes } from "./reducers"
import { createPagedItemsActions } from "../../models/paged_items_factory"
import { list as listContainers } from '../containers/actions'

const actions = createPagedItemsActions(actionTypes, selectContainersTable, listContainers)

export default actions