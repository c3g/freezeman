import { FMSId } from '../../models/fms_api_models'
import { AppDispatch, RootState } from '../../store'
import { FLUSH_STUDY_SAMPLES, GET_STUDY_SAMPLES, SET_HIDE_EMPTY_STEPS } from './reducers'
import { loadStudySamples } from './services'


export function getStudySamples(studyID : FMSId) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		dispatch({type: GET_STUDY_SAMPLES.REQUEST, meta: {studyID}})
		try {
			const studySamples = await loadStudySamples(studyID)
			if (studySamples) {
				dispatch({type: GET_STUDY_SAMPLES.RECEIVE, meta: {studyID, studySamples}})
			}
		} catch(err) {
			dispatch({type: GET_STUDY_SAMPLES.ERROR, error: err, meta: {studyID}})
		}
	}
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
	getStudySamples,
	flushStudySamples,
	setHideEmptySteps,
}