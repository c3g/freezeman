import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectLibrariesTable } from "../../selectors"
import { list as listLibraries } from '../libraries/actions'
import { PREFIX } from "./reducers"

const actions = createPagedItemsActions(PREFIX, selectLibrariesTable, (option) => listLibraries(option, true))

export default actions