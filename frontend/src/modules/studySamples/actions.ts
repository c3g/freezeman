import { FMSId } from '../../models/fms_api_models'
import { FilterDescription, FilterOptions, FilterValue, SortBy } from '../../models/paged_items'
import { selectStudySamplesByID } from '../../selectors'
import { AppDispatch, RootState } from '../../store'
import { fetchSamples } from '../cache/cache'
import { StudyStepSamplesTabSelection } from './models'
import { FLUSH_STUDY_SAMPLES, GET_STUDY_SAMPLES, INIT_STUDY_SAMPLES_SETTINGS, REMOVE_STUDY_STEP_FILTER, SET_HIDE_EMPTY_STEPS, SET_REFRESHED_STEP_SAMPLES, SET_STUDY_EXPANDED_STEPS, SET_STUDY_STEP_FILTER, SET_STUDY_STEP_FILTER_OPTIONS, SET_STUDY_STEP_SAMPLES_TAB, SET_STUDY_STEP_SORT_ORDER } from './reducers'
import { fetchSamplesAtStepOrder, loadStudySamples } from './services'


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

function refreshSamplesAtStepOrder(studyID: FMSId, stepOrderID: FMSId) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {

		// Get the updated list of SampleNextStep objects for the step
		const result = await fetchSamplesAtStepOrder(studyID, stepOrderID)
		const sampleIDs = result.sampleNextSteps.map(nextStep => nextStep.sample)

		// Fetch any samples that need to be loaded
		await fetchSamples(sampleIDs)

		// Update the study state
		dispatch({
			type: SET_REFRESHED_STEP_SAMPLES,
			studyID,
			stepOrderID,
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

export function initStudySamplesSettings(studyID: FMSId, stepOrderIDs: FMSId[]) {
	return {
		type: INIT_STUDY_SAMPLES_SETTINGS,
		studyID,
		stepOrderIDs
	}
}

export function setStudyExpandedSteps(studyID: FMSId, stepOrderIDs: FMSId[]) {
	return {
		type: SET_STUDY_EXPANDED_STEPS,
		studyID,
		stepOrderIDs
	}
}

export function setStudyStepSamplesTab(studyID: FMSId, stepOrderID: FMSId, selectedSamplesTab: StudyStepSamplesTabSelection) {
	return {
		type: SET_STUDY_STEP_SAMPLES_TAB,
		studyID,
		stepOrderID,
		selectedSamplesTab
	}
}

export function setStudyStepFilter(studyID: FMSId, stepOrderID: FMSId, description: FilterDescription, value: FilterValue) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		dispatch({
			type: SET_STUDY_STEP_FILTER,
			studyID,
			stepOrderID,
			description,
			value
		})
		dispatch(refreshSamplesAtStepOrder(studyID, stepOrderID))
	}	
}

export function setStudyStepFilterOptions(studyID: FMSId, stepOrderID: FMSId, description: FilterDescription, options: FilterOptions) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		dispatch({
			type: SET_STUDY_STEP_FILTER_OPTIONS,
			studyID,
			stepOrderID,
			description,
			options
		})
		dispatch(refreshSamplesAtStepOrder(studyID, stepOrderID))
	}
}

export function removeStudyStepFilter(studyID: FMSId, stepOrderID: FMSId, description: FilterDescription) {
	return async (dispatch: AppDispatch) => {
		dispatch({
			type: REMOVE_STUDY_STEP_FILTER,
			studyID,
			stepOrderID,
			description
		})
		dispatch(refreshSamplesAtStepOrder(studyID, stepOrderID))
	}
}

export function setStudyStepSortOrder(studyID: FMSId, stepOrderID: FMSId, sortBy: SortBy) {
	return async (dispatch: AppDispatch) => {
		dispatch({
			type: SET_STUDY_STEP_SORT_ORDER,
			studyID,
			stepOrderID,
			sortBy
		})
		dispatch(refreshSamplesAtStepOrder(studyID, stepOrderID))
	}
}

export default {
	getStudySamples,
	flushStudySamples,
	setHideEmptySteps,
}