import { Project } from "../../models/frontend_models"
import { FreezemanAsyncThunk, createPagedItemsActions } from "../../models/paged_items_factory"
import { selectProjectSamplesTable } from "../../selectors"
import { list as listSamples } from '../samples/actions'
import { actionTypes } from "./reducers"

const defaultActions = createPagedItemsActions(actionTypes, selectProjectSamplesTable, listSamples)

const setProject: (projectID: Project['id']) => FreezemanAsyncThunk<void> = (projectID: Project['id']) => async (dispatch, getState) =>  {
    if (getState().projectSamplesTable.projectID == projectID) return

    dispatch({
        type: actionTypes.SET_PROJECT,
        projectID
    })
    
    return dispatch(defaultActions.listPage(1))
}

const actions = {
    ...defaultActions,
    setProject
}

export default actions