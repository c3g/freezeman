import { Project, ReferenceGenome, Workflow, WorkflowStepRange } from '../../models/frontend_models'
import { AppDispatch, RootState } from '../../store'
import { createNetworkActionTypes, networkAction } from '../../utils/actions'
import api from '../../utils/api'
import { projectTemplateActions } from '../projects/reducers'

export const GET = createNetworkActionTypes('STUDIES.GET')
export const ADD = createNetworkActionTypes('STUDIES.ADD')
export const UPDATE = createNetworkActionTypes('STUDIES.UPDATE')

export const get = (id: number) => async (dispatch: AppDispatch, getState: () => RootState) => {
	const study = getState().studies.itemsByID[id]
	if (study && study.isFetching) return

	return await dispatch(networkAction(GET, api.studies.get(id), { meta: { id } }))
}

export const add =
	(study: { project: Project; referenceGenome?: ReferenceGenome; workflow: Workflow, stepRange: WorkflowStepRange }) =>
	async (dispatch: AppDispatch, getState: () => RootState) => {
		if (getState().studies.isFetching) return

		// TODO This is using the default django endpoint to create a study, but a new endpoint
		// is in development which will generate the study letter for us. Update this call once
		// the endpoint is ready.
		const data = {
			project: study.project.id,
			workflow: study.workflow.id,
			reference_genome: study.referenceGenome?.id ?? '',
			start: study.stepRange.start,
			end: study.stepRange.end,
		}

		return await dispatch(networkAction(ADD, api.studies.add(data), { meta: {} }))
	}

export const update =
	(id: number, study: { referenceGenome?: ReferenceGenome; workflow?: Workflow }) =>
	async (dispatch: AppDispatch, getState: () => RootState) => {
		if (getState().studies.itemsByID[id].isFetching) return

		return await dispatch(networkAction(UPDATE, api.studies.update(study), { meta: { id, ignoreError: 'APIError' } }))
	}

export default {
	GET,
	ADD,
	UPDATE,
	get,
	add,
	update,
}

// Helper to call list() after another action
// function thenList(fn) {
//     return (...args) => async dispatch => {
//         dispatch(fn(...args))
//         dispatch(listTable(undefined, true))
//     }
// }
