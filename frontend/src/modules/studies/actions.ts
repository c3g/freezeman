import { Project, Workflow, WorkflowStepRange } from '../../models/frontend_models'
import { AppDispatch, RootState } from '../../store'
import { createNetworkActionTypes, networkAction } from '../../utils/actions'
import api from '../../utils/api'

export const GET = createNetworkActionTypes('STUDIES.GET')
export const ADD = createNetworkActionTypes('STUDIES.ADD')
export const UPDATE = createNetworkActionTypes('STUDIES.UPDATE')
export const LIST_PROJECT_STUDIES = createNetworkActionTypes('STUDIES.LIST_PROJECT_STUDIES')

export const get = (id: number) => async (dispatch: AppDispatch, getState: () => RootState) => {
	const study = getState().studies.itemsByID[id]
	if (study && study.isFetching) return

	return await dispatch(networkAction(GET, api.studies.get(id), { meta: { id } }))
}

export const add =
	(study: { project: Project, workflow: Workflow, stepRange: WorkflowStepRange }) =>
	async (dispatch: AppDispatch, getState: () => RootState) => {
		if (getState().studies.isFetching) return
		
		const data = {
			project: study.project.id,
			workflow: study.workflow.id,
			start: study.stepRange.start,
			end: study.stepRange.end,
			// TODO: The reference_genome parameter is obsolete, but the backend still expects it.
			// Remove it when the backend is updated.
			reference_genome: null	
		}

		return await dispatch(networkAction(ADD, api.studies.add(data), { meta: {} }))
	}

export const update =
	(id: number, study: { workflow?: Workflow }) =>
	async (dispatch: AppDispatch, getState: () => RootState) => {
		if (getState().studies.itemsByID[id].isFetching) return

		return await dispatch(networkAction(UPDATE, api.studies.update(study), { meta: { id, ignoreError: 'APIError' } }))
	}

export const listProjectStudies = (projectId: number) => {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		if (getState().studies.isFetching) {
			return
		}

		return await dispatch(networkAction(LIST_PROJECT_STUDIES, api.studies.listProjectStudies(projectId), {}))
	}
}

export default {
	GET,
	ADD,
	UPDATE,
	LIST_PROJECT_STUDIES,
	get,
	add,
	update,
	listProjectStudies
}
