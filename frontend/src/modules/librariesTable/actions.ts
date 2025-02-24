import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectLibrariesTable } from "../../selectors"
import { list as listLibraries } from '../libraries/actions'
import { actionTypes } from "./reducers"

const actions = createPagedItemsActions(actionTypes, selectLibrariesTable, (option) => listLibraries(option, true))

export default actions