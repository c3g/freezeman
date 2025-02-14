import { FMSId } from '../../models/fms_api_models'
import { Project, Workflow, WorkflowStepRange } from '../../models/frontend_models'
import { AppDispatch, RootState } from '../../store'
import { networkAction } from '../../utils/actions'
import api from '../../utils/api'
import { ADD, GET, LIST, LIST_PROJECT_STUDIES, UPDATE, REMOVE } from './reducers'

export const get = (id: number) => async (dispatch: AppDispatch, getState: () => RootState) => {
	const study = getState().studies.itemsByID[id]
	if (study && study.isFetching) return

	return await dispatch(networkAction(GET, api.studies.get(id), { meta: { id } }))
}

export const list = (options: any) => async (dispatch: AppDispatch) => {
	const params = { limit: 100000, ...options }
	console.info('list sudies params', params)
    return await dispatch(networkAction(LIST,
        api.studies.list(params),
        { meta: params }
    ));
};

export const add =
	(study: { project: Project, workflow: Workflow, stepRange: WorkflowStepRange, description: string | null }) =>
	async (dispatch: AppDispatch, getState: () => RootState) => {
		if (getState().studies.isFetching) return

		const data = {
			project: study.project.id,
			workflow: study.workflow.id,
			start: study.stepRange.start,
			end: study.stepRange.end,
			description: study.description,
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

export const remove = (id: FMSId) => async (dispatch: AppDispatch, getState: () => RootState) => {
	const study = getState().studies.itemsByID[id]
	if (study && study.isRemoving) return
	return await dispatch(networkAction(REMOVE, api.studies.remove(id), { meta: { id } } ))
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
