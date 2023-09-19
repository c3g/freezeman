import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectUsersTable } from "../../selectors"
import { actionTypes } from "./reducers"
import { list as listUsers } from '../users/actions'

const actions = createPagedItemsActions(actionTypes, selectUsersTable, listUsers)

export default actions
