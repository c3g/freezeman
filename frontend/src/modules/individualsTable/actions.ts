import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectIndividualsTable } from "../../selectors"
import { list as listIndividuals } from '../individuals/actions'
import { PREFIX } from "./reducers"

const actions = createPagedItemsActions(PREFIX, selectIndividualsTable, listIndividuals)

export default actions