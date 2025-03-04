import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectUsersTable } from "../../selectors"
import { PREFIX } from "./reducers"
import { list as listUsers } from '../users/actions'

const actions = createPagedItemsActions(PREFIX, selectUsersTable, listUsers)

export default actions
