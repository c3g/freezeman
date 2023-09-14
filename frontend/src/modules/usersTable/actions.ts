import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectUsersTable } from "../../selectors"
import { actionTypes } from "./reducers"
import api from "../../utils/api"

const actions = createPagedItemsActions(actionTypes, selectUsersTable, api.users.list)

export default actions
