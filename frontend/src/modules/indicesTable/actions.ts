
import { createPagedItemsActions } from '../../models/paged_items_factory'
import { selectIndicesTable } from '../../selectors'
import { actionTypes } from './reducers'
import { list as listIndices } from '../indices/actions'

const actions = createPagedItemsActions(actionTypes, selectIndicesTable, listIndices)

export default actions