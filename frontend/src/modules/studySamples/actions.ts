import { FMSSample, FMSSampleNextStepByStudy, FMSStepHistory } from '../../models/fms_api_models'
import { selectStudiesByID, selectStudySamplesByID, selectWorkflowsByID } from '../../selectors'
import { AppDispatch, RootState } from '../../store'
import { createNetworkActionTypes } from '../../utils/actions'
import api from '../../utils/api'
import { list as listSamples } from '../samples/actions'
import { list as listLibraries } from '../libraries/actions'
import { buildStudySamplesFromWorkflow } from './services'

export const GET_STUDY_SAMPLES = createNetworkActionTypes('STUDY_SAMPLES.GET_STUDY_SAMPLES')
export const FLUSH_STUDY_SAMPLES = 'STUDY_SAMPLES.FLUSH_STUDY_SAMPLES'
export const SET_HIDE_EMPTY_STEPS = 'STUDY_SAMPLES.SET_HIDE_EMPTY_STEPS'


export const getStudySamples = (studyID : number) => {

	 async function fetch(dispatch: AppDispatch, getState: () => RootState) {
		const currentState = selectStudySamplesByID(getState())
		const existingState = currentState[studyID]
		if (existingState?.isFetching) {
			return
		}

		const studiesByID = selectStudiesByID(getState())
		const study = studiesByID[studyID]
		if(! study) {
			dispatch({type: GET_STUDY_SAMPLES.ERROR, error: Error(`Study ${studyID} is not loaded.`), meta: {studyID}})
		}
		if (study.isFetching) {
			return
		}

		const workflowsByID = selectWorkflowsByID(getState())
		const workflow = workflowsByID[study.workflow_id]
		if(! workflow) {
			dispatch({type: GET_STUDY_SAMPLES.ERROR, error: Error(`Workflow ${study.workflow_id} for study is not loaded.`), meta: {studyID}})
		}
		if (workflow.isFetching) {
			return
		}

		dispatch({type: GET_STUDY_SAMPLES.REQUEST, meta: {studyID}})

		// Get the study samples
		try {
			// TODO - better error handling
			// Get samples that are waiting to be processed by a step
			let sampleNextStepsByStudy : FMSSampleNextStepByStudy[] | undefined
			const sampleNextStepResponse = await dispatch(api.sampleNextStepByStudy.getStudySamples(studyID))
			if (sampleNextStepResponse.data.results) {
				sampleNextStepsByStudy = sampleNextStepResponse.data.results as FMSSampleNextStepByStudy[]
			}

			// Get samples that have completed the process at a step
			let completedSamplesByStudy : FMSStepHistory[] | undefined
			const sampleHistoryResponse = await dispatch(api.stepHistory.getCompletedSamplesForStudy(studyID))
			if (sampleHistoryResponse.data.results) {
				completedSamplesByStudy = sampleHistoryResponse.data.results as FMSStepHistory[]
			}

			if (sampleNextStepsByStudy && completedSamplesByStudy) {
				const studySamples = buildStudySamplesFromWorkflow(study, workflow, sampleNextStepsByStudy, completedSamplesByStudy)

				// Fetch the study samples
				if (studySamples.sampleList.length > 0) {
					const params = {
						"id__in": studySamples.sampleList.join(',')
					}
					try {
						// TODO: Only fetch samples and libraries that are not already in the store
						const response = await dispatch(listSamples(params))
						if (response && Array.isArray(response.results)) {
							// If any samples are libraries, load the libraries as well.
							const samples = response.results as FMSSample[]
							const sampleIDs = samples.filter(sample => sample.is_library).map(sample => sample.id)
							if (sampleIDs.length > 0) {
								const library_params = {
									"sample__id__in": sampleIDs.join(',')
								}
								dispatch(listLibraries(library_params))
							}
						} else {
							throw Error('unexpected value returned by listSamples')
						}
					} catch(err) {
						console.error('Failed to retrieve study samples', err)
					}
				}

				// Finally, push the study samples to redux
				dispatch({type: GET_STUDY_SAMPLES.RECEIVE, meta: {studyID, studySamples}})
			} else {
				throw(Error('Invalid server response received from sample-next-step api'))
			}
		} catch(err) {
			dispatch({type: GET_STUDY_SAMPLES.ERROR, error: err, meta: {studyID}})
		}
	}

	return fetch
}

export function flushStudySamples(studyID: number) {
	return {
		type: FLUSH_STUDY_SAMPLES,
		studyID
	}
}

export function setHideEmptySteps(hide: boolean) {
	return {
		type: SET_HIDE_EMPTY_STEPS,
		hideEmptySteps: hide
	}
}

export default {
	GET_STUDY_SAMPLES,
	FLUSH_STUDY_SAMPLES,
	SET_HIDE_EMPTY_STEPS,
	getStudySamples,
	flushStudySamples,
	setHideEmptySteps,
}