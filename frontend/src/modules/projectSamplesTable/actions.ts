import { SAMPLE_COLUMN_FILTERS, SAMPLE_FILTER_KEYS, SampleColumnID } from "../../components/samples/SampleTableColumns"
import { FILTER_TYPE } from "../../constants"
import { Project } from "../../models/frontend_models"
import { FreezemanAsyncThunk, createPagedItemsActions } from "../../models/paged_items_factory"
import { selectProjectSamplesTable } from "../../selectors"
import { list as listSamples } from '../samples/actions'
import { PREFIX } from "./reducers"

const pagedItemsActions = createPagedItemsActions(PREFIX, selectProjectSamplesTable, (option) => listSamples(option, true))

const PROJECT_FILTER_KEY = SAMPLE_FILTER_KEYS[SampleColumnID.PROJECT]
const PROJECT_FILTER_DESCRIPTION = SAMPLE_COLUMN_FILTERS[SampleColumnID.PROJECT]

const setProject: (projectID: Project['id']) => FreezemanAsyncThunk<void> = (projectID: Project['id']) => async (dispatch, getState) =>  {    
    const state = selectProjectSamplesTable(getState())
    const filter = state.filters[PROJECT_FILTER_KEY]
    if (filter && filter.value === projectID) {
        return
    }

    await dispatch(pagedItemsActions.resetPagedItems())
    
    await dispatch(pagedItemsActions.setFilter(
        PROJECT_FILTER_KEY,
        projectID.toString(),
        PROJECT_FILTER_DESCRIPTION,
    ))
    await dispatch(pagedItemsActions.setFilterFixed(PROJECT_FILTER_KEY, true))

    return await dispatch(pagedItemsActions.listPage(1))
}

export default {
    ...pagedItemsActions,
    setProject
}