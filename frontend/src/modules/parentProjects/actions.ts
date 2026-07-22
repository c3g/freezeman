import { FMSId, FMSPagedResultsReponse } from '../../models/fms_api_models'
import { ParentProject } from '../../models/frontend_models'
import { selectParentProjectsByID } from '../../selectors'
import { AppDispatch, RootState } from '../../store'
import { NetworkActionThunk, createNetworkActionTypes, networkAction } from '../../utils/actions'
import api from '../../utils/api'

export const GET = createNetworkActionTypes('PARENT_PROJECTS.GET')
export const LIST = createNetworkActionTypes('PARENT_PROJECTS.LIST')

export const get = (id: FMSId): NetworkActionThunk<any> => async (dispatch, getState) => {
    const parentProject = getState().parentProjects.itemsByID[id]
    if (parentProject && parentProject.isFetching) return

    return dispatch(networkAction(GET, api.parentProjects.get(id), { meta: { id } }))
}

export const list = (options: object) => {
    return async (dispatch: AppDispatch, getState: () => RootState): Promise<FMSPagedResultsReponse<ParentProject>> => {
        const params = { limit: 100000, ...options }
        const response = await dispatch(networkAction(LIST, api.parentProjects.list(params), { meta: params }))
        const parentProjectsByID = selectParentProjectsByID(getState())
        return {
            ...response,
            results: response.results.map((p) => parentProjectsByID[p.id])
        }
    }
}


export default {
    GET,
    LIST,
    get,
    list,
}
