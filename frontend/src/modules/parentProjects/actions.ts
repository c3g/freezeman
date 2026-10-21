import { FMSId } from '../../models/fms_api_models'
import { AppDispatch, RootState } from '../../store'
import { createNetworkActionTypes, networkAction } from '../../utils/actions'
import api from '../../utils/api'

export const GET = createNetworkActionTypes('PARENT_PROJECTS.GET')
export const LIST = createNetworkActionTypes('PARENT_PROJECTS.LIST')

export const get = (id: FMSId) => async (dispatch: AppDispatch, getState: () => RootState) => {
    const parentProject = getState().parentProjects.itemsByID[id]
    if (parentProject && parentProject.isFetching) return

    return await dispatch(networkAction(GET, api.parentProjects.get(id), { meta: { id } }))
}

export const list = (options: object) => {
    return async (dispatch: AppDispatch) => {
        const params = { limit: 100000, ...options }
        return await dispatch(networkAction(LIST, api.parentProjects.list(params), { meta: params }))
    }
}


export default {
    GET,
    LIST,
    get,
    list,
}
