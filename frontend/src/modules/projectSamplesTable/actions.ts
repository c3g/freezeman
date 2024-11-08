import { FILTER_TYPE } from "../../constants"
import { Project } from "../../models/frontend_models"
import { createFixedFilter } from "../../models/paged_items"
import { FreezemanAsyncThunk, createPagedItemsActions } from "../../models/paged_items_factory"
import { selectProjectSamplesTable } from "../../selectors"
import { list as listSamples } from '../samples/actions'
import { actionTypes } from "./reducers"

const pagedItemsActions = createPagedItemsActions(actionTypes, (state) => selectProjectSamplesTable(state).pagedItems, (option) => listSamples(option, true))

const setProject: (projectID: Project['id']) => FreezemanAsyncThunk<void> = (projectID: Project['id']) => async (dispatch, getState) =>  {
    
    if (getState().projectSamplesTable.projectID === projectID) return
    
    await dispatch(pagedItemsActions.resetPagedItems())
    
    dispatch({
        type: actionTypes.SET_PROJECT,
        projectID
    })

    dispatch(pagedItemsActions.setFixedFilter(createFixedFilter(
        FILTER_TYPE.INPUT_OBJECT_ID,
        'derived_by_samples__project__id',
        projectID.toString()
    )))

    return await dispatch(pagedItemsActions.listPage(1))
}

export default {
    ...pagedItemsActions,
    setProject
}