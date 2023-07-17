import { FMSId, FMSProject } from '../../models/fms_api_models'
import { AppDispatch } from '../../store'
import { NetworkActionThunk, createNetworkActionTypes, networkAction } from '../../utils/actions'
import api from '../../utils/api'

export const GET = createNetworkActionTypes('PROJECTS.GET')
export const ADD = createNetworkActionTypes('PROJECTS.ADD')
export const UPDATE = createNetworkActionTypes('PROJECTS.UPDATE')
export const LIST = createNetworkActionTypes('PROJECTS.LIST')
export const SUMMARY = createNetworkActionTypes('PROJECTS.SUMMARY')
export const LIST_TEMPLATE_ACTIONS = createNetworkActionTypes('PROJECTS.LIST_TEMPLATE_ACTIONS')

export const get = (id: FMSId): NetworkActionThunk<any> => async (dispatch, getState) => {
	const project = getState().projects.itemsByID[id]
	if (project && project.isFetching) return

	return dispatch(networkAction(GET, api.projects.get(id), { meta: { id } }))
}

export const add = (project: Partial<FMSProject>) : NetworkActionThunk<any> => async (dispatch, getState) => {
	if (getState().projects.isFetching) return

	return dispatch(networkAction(ADD, api.projects.add(project), { meta: { ignoreError: 'APIError' } }))
}

export const update = (id: FMSId, project: Partial<FMSProject>): NetworkActionThunk<any> => async (dispatch, getState) => {
	if (getState().projects.itemsByID[id].isFetching) return

	return dispatch(networkAction(UPDATE, api.projects.update(project), { meta: { id, ignoreError: 'APIError' } }))
}

export const list = (options: object) : NetworkActionThunk<any> => async (dispatch) => {
	const params = { limit: 100000, ...options }
	return dispatch(networkAction(LIST, api.projects.list(params), { meta: params }))
}

export const summary = () => (dispatch: AppDispatch) => dispatch(networkAction(SUMMARY, api.projects.summary()))

export const listTemplateActions = (): NetworkActionThunk<any> => (dispatch, getState) => {
	if (getState().projectTemplateActions.isFetching) return
	return dispatch(networkAction(LIST_TEMPLATE_ACTIONS, api.projects.template.actions()))
}

export default {
	GET,
	ADD,
	UPDATE,
	LIST,
	SUMMARY,
	LIST_TEMPLATE_ACTIONS,
	get,
	add,
	update,
	list,
	summary,
	listTemplateActions,
}
