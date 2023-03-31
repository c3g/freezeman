import { FMSId } from '../../models/fms_api_models'
import { FilterDescription, FilterOptions, FilterValue, SortBy } from '../../models/paged_items'
import { selectStudySamplesByID } from '../../selectors'
import { AppDispatch, RootState } from '../../store'
import { fetchSamples } from './cache'
import { StudyStepSamplesTabSelection } from './models'
import { FLUSH_STUDY_SAMPLES, GET_STUDY_SAMPLES, INIT_STUDY_SAMPLES_SETTINGS, REMOVE_STUDY_STEP_FILTER, SET_HIDE_EMPTY_STEPS, SET_REFRESHED_STEP_SAMPLES, SET_STUDY_EXPANDED_STEPS, SET_STUDY_STEP_FILTER, SET_STUDY_STEP_FILTER_OPTIONS, SET_STUDY_STEP_SAMPLES_TAB, SET_STUDY_STEP_SORT_ORDER } from './reducers'
import { fetchSamplesAtStep, loadStudySamples } from './services'


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

export function refreshStudySamples(studyID: FMSId) {
	return getStudySamples(studyID)
}

export function refreshAllStudySamples() {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		const studySamplesByID = selectStudySamplesByID(getState())
		for(const studyID in studySamplesByID) {
			dispatch(refreshStudySamples(Number.parseInt(studyID)))
		}
	}
}

function refreshSamplesAtStep(studyID: FMSId, stepID: FMSId) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {

		// Get the updated list of SampleNextStep objects for the step
		const result = await fetchSamplesAtStep(studyID, stepID)
		const sampleIDs = result.sampleNextSteps.map(nextStep => nextStep.sample)

		// Fetch any samples that need to be loaded
		await fetchSamples(sampleIDs)

		// Update the study state
		dispatch({
			type: SET_REFRESHED_STEP_SAMPLES,
			studyID,
			stepID,
			sampleIDs,
		})
		
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

export function initStudySamplesSettings(studyID: FMSId, stepIDs: FMSId[]) {
	return {
		type: INIT_STUDY_SAMPLES_SETTINGS,
		studyID,
		stepIDs
	}
}

export function setStudyExpandedSteps(studyID: FMSId, stepIDs: FMSId[]) {
	return {
		type: SET_STUDY_EXPANDED_STEPS,
		studyID,
		stepIDs
	}
}

export function setStudyStepSamplesTab(studyID: FMSId, stepID: FMSId, selectedSamplesTab: StudyStepSamplesTabSelection) {
	return {
		type: SET_STUDY_STEP_SAMPLES_TAB,
		studyID,
		stepID,
		selectedSamplesTab
	}
}

export function setStudyStepFilter(studyID: FMSId, stepID: FMSId, description: FilterDescription, value: FilterValue) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		dispatch({
			type: SET_STUDY_STEP_FILTER,
			studyID,
			stepID,
			description,
			value
		})
		dispatch(refreshSamplesAtStep(studyID, stepID))
	}
	
	// return {
	
}

export function setStudyStepFilterOptions(studyID: FMSId, stepID: FMSId, description: FilterDescription, options: FilterOptions) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		dispatch({
			type: SET_STUDY_STEP_FILTER_OPTIONS,
			studyID,
			stepID,
			description,
			options
		})
		dispatch(refreshSamplesAtStep(studyID, stepID))
	}
}

export function removeStudyStepFilter(studyID: FMSId, stepID: FMSId, description: FilterDescription) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		dispatch({
			type: REMOVE_STUDY_STEP_FILTER,
			studyID,
			stepID,
			description
		})
		dispatch(refreshSamplesAtStep(studyID, stepID))
	}
}

export function setStudyStepSortOrder(studyID: FMSId, stepID: FMSId, sortBy: SortBy) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		dispatch({
			type: SET_STUDY_STEP_SORT_ORDER,
			studyID,
			stepID,
			sortBy
		})
		dispatch(refreshSamplesAtStep(studyID, stepID))
	}
}

export default {
	getStudySamples,
	flushStudySamples,
	setHideEmptySteps,
}