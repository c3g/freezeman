import { FILTER_TYPE } from "../../constants"
import { Project } from "../../models/frontend_models"
import { createFixedFilter } from "../../models/paged_items"
import { FreezemanAsyncThunk, createPagedItemsActions } from "../../models/paged_items_factory"
import { selectProjectSamplesTable } from "../../selectors"
import { list as listSamples } from '../samples/actions'
import { actionTypes } from "./reducers"

const defaultActions = createPagedItemsActions(actionTypes, selectProjectSamplesTable, listSamples)

const setProject: (projectID: Project['id']) => FreezemanAsyncThunk<void> = (projectID: Project['id']) => async (dispatch, getState) =>  {
    const filterKey = 'derived_samples__project__id'
    const fixedFilters = () => getState().projectSamplesTable.fixedFilters

    if (filterKey in fixedFilters() && fixedFilters()[filterKey].value === projectID.toString()) return

    await dispatch(defaultActions.resetPagedItems())

    dispatch({
        type: actionTypes.SET_PROJECT,
        projectID
    })

    dispatch(defaultActions.setFixedFilter(createFixedFilter(
        FILTER_TYPE.INPUT_OBJECT_ID,
        filterKey,
        projectID.toString()
    )))

    return await dispatch(defaultActions.listPage(1))
}

const actions = {
    ...defaultActions,
    setProject
}

export default actions