
import { createPagedItemsActions } from '../../models/paged_items_factory'
import { selectIndicesTable } from '../../selectors'
import { PREFIX } from './reducers'
import { list as listIndices } from '../indices/actions'

const actions = createPagedItemsActions(PREFIX, selectIndicesTable, listIndices)

export default actions