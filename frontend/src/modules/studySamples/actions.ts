import { FMSSampleNextStep } from '../../models/fms_api_models'
import { buildStudySamples } from '../../models/study_samples'
import { selectStudySamples } from '../../selectors'
import { AppDispatch, RootState } from '../../store'
import { createNetworkActionTypes, networkAction } from '../../utils/actions'
import api from '../../utils/api'
import { list } from '../samples/actions'

export const GET_STUDY_SAMPLES = createNetworkActionTypes('STUDY_SAMPLES.GET_STUDY_SAMPLES')



export const getStudySamples = (studyID : number) => {

	 async function fetch(dispatch: AppDispatch, getState: () => RootState) {
		const currentState = selectStudySamples(getState())
		const study = currentState[studyID]
		if (study?.isFetching) {
			return
		}

		dispatch({type: GET_STUDY_SAMPLES.REQUEST, meta: {studyID}})

		// Get the study samples
		try {
			const response = await dispatch(api.sampleNextStep.getStudySamples(studyID))
			if (response.data.results) {
				const sampleNextSteps = response.data.results as FMSSampleNextStep[]
				const studySamples = buildStudySamples(sampleNextSteps)

				// EXPERIMENT -> Fetch the samples
				if (studySamples.sampleList.length > 0) {
					const params = {
						"id__in": studySamples.sampleList.join(',')
					}
					try {
						dispatch(list(params))
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

export default {
	GET_STUDY_SAMPLES,
	getStudySamples
}