import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectProjectsOfSamples } from "../../selectors"
import { PREFIX } from "./reducers"
import { list as listProjects } from '../projects/actions'

const actions = createPagedItemsActions(PREFIX, selectProjectsOfSamples, listProjects)

export default actions