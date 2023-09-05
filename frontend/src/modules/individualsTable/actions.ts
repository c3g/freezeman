import { createPagedItemsActions } from "../../models/paged_items_factory"
import { selectIndividualsTable } from "../../selectors"
import { list as listIndividuals } from '../individuals/actions'
import { actionTypes } from "./reducers"

const actions = createPagedItemsActions(actionTypes, selectIndividualsTable, listIndividuals)

export default actions