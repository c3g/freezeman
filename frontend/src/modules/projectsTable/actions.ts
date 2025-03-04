import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectProjectsTable } from "../../selectors"
import { list as listProjects } from '../projects/actions'
import { PREFIX } from "./reducers"

const actions = createPagedItemsActions(PREFIX, selectProjectsTable, listProjects)

export default actions