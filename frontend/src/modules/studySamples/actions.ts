import { FMSId } from '../../models/fms_api_models'
import { FilterDescription, FilterOptions, FilterValue, SortBy } from '../../models/paged_items'
import { selectStudiesByID, selectStudySamplesByID, selectStudySettingsByID, selectStudyTableStatesByID, selectWorkflowsByID } from '../../selectors'
import { AppDispatch, RootState } from '../../store'
import { fetchSamples } from '../cache/cache'
import { StudySampleStep, StudyStepSamplesTabSelection } from './models'
import { CLEAR_FILTERS, FLUSH_STUDY_SAMPLES, GET_STUDY_SAMPLES, INIT_STUDY_SAMPLES_SETTINGS_AND_TABLES, REMOVE_STUDY_STEP_FILTER, SET_HIDE_EMPTY_STEPS, SET_REFRESHED_STEP_SAMPLES, SET_STUDY_EXPANDED_STEPS, SET_STUDY_STEP_FETCHING, SET_STUDY_STEP_FILTER, SET_STUDY_STEP_FILTER_OPTIONS, SET_STUDY_STEP_PAGE_NUMBER, SET_STUDY_STEP_PAGE_SIZE, SET_STUDY_STEP_SAMPLES_TAB, SET_STUDY_STEP_SORT_ORDER } from './reducers'
import { fetchSamplesAtStepOrder, loadStudySamplesInStepByStudy, loadStudySampleStep } from './services'


export function getStudySamples(studyID: FMSId) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		dispatch({ type: GET_STUDY_SAMPLES.REQUEST, meta: { studyID } })
		try {
			let studySamples: StudySampleStep[] = []
			const studiesById = selectStudiesByID(getState())
			const workflowsById = selectWorkflowsByID(getState())
			const study = studiesById[studyID]
			if (study) {
				const workflow = workflowsById[study.workflow_id]
				if (workflow) {
					dispatch(initStudySamplesSettingsAndTables(studyID, workflow.steps_order.map((x) => x.id)))
					studySamples = await Promise.all(workflow.steps_order.map(async (stepOrder) => {
						dispatch(setStudyStepFetching(studyID, stepOrder.id, true))
						const result = await loadStudySampleStep(studyID, stepOrder)
						dispatch(setStudyStepFetching(studyID, stepOrder.id, false))
						return result
					}))
				}
			}
			if (studySamples) {
				dispatch({ type: GET_STUDY_SAMPLES.RECEIVE, meta: { studyID, studySamples: { steps: studySamples } } })
			}
		} catch (err) {
			dispatch({ type: GET_STUDY_SAMPLES.ERROR, error: err, meta: { studyID } })
		}
	}
}

export function refreshStudySamples(studyID: FMSId) {
	return getStudySamples(studyID)
}

export function refreshAllStudySamples() {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		const studySamplesByID = selectStudySamplesByID(getState())
		await Promise.all(Object.keys(studySamplesByID).map((studyID) => dispatch(refreshStudySamples(Number.parseInt(studyID)))))
	}
}

export function refreshSamplesAtStepOrder(studyID: FMSId, stepOrderID: FMSId) {
	return async (dispatch: AppDispatch) => {
		const studySamplesInStepByStudy = await loadStudySamplesInStepByStudy(studyID, stepOrderID)
		dispatch({
			type: SET_REFRESHED_STEP_SAMPLES,
			studyID,
			stepOrderID,
			...studySamplesInStepByStudy
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

// should only be used by getStudySamples
function initStudySamplesSettingsAndTables(studyID: FMSId, stepOrderIDs: FMSId[]) {
	return {
		type: INIT_STUDY_SAMPLES_SETTINGS_AND_TABLES,
		studyID,
		stepOrderIDs
	}
}

export function clearFilters(studyID: FMSId, stepOrderID: FMSId) {
	return async (dispatch: AppDispatch) => {
		dispatch({
			type: CLEAR_FILTERS,
			studyID,
			stepOrderID
		})
		await dispatch(refreshSamplesAtStepOrder(studyID, stepOrderID))
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
	return async (dispatch: AppDispatch) => {
		dispatch({
			type: SET_STUDY_STEP_FILTER,
			studyID,
			stepOrderID,
			description,
			value
		})
		await dispatch(refreshSamplesAtStepOrder(studyID, stepOrderID))
	}	
}

export function setStudyStepFilterOptions(studyID: FMSId, stepOrderID: FMSId, description: FilterDescription, options: FilterOptions) {
	return async (dispatch: AppDispatch) => {
		dispatch({
			type: SET_STUDY_STEP_FILTER_OPTIONS,
			studyID,
			stepOrderID,
			description,
			options
		})
		await dispatch(refreshSamplesAtStepOrder(studyID, stepOrderID))
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
		await dispatch(refreshSamplesAtStepOrder(studyID, stepOrderID))
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
		await dispatch(refreshSamplesAtStepOrder(studyID, stepOrderID))
	}
}

export function setStudyStepPageSize(studyID: FMSId, stepOrderID: FMSId, pageSize: number) {
	return async (dispatch: AppDispatch) => {
		dispatch({
			type: SET_STUDY_STEP_PAGE_SIZE,
			studyID,
			stepOrderID,
			pageSize
		})
		// FIXME: does not actually reset page number :(
		dispatch(setStudyStepPageNumberLight(studyID, stepOrderID, 'ready', 1))
		dispatch(setStudyStepPageNumberLight(studyID, stepOrderID, 'completed', 1))
		dispatch(setStudyStepPageNumberLight(studyID, stepOrderID, 'removed', 1))

		dispatch(setStudyStepFetching(studyID, stepOrderID, true))
		await dispatch(refreshSamplesAtStepOrder(studyID, stepOrderID))
		dispatch(setStudyStepFetching(studyID, stepOrderID, false))
	}
}

// set page number without fetching samples
function setStudyStepPageNumberLight(studyID: FMSId, stepOrderID: FMSId, tabSelection: StudyStepSamplesTabSelection, pageNumber: number) {
	return {
		type: SET_STUDY_STEP_PAGE_NUMBER,
		studyID,
		stepOrderID,
		tabSelection,
		pageNumber
	}
}

export function setStudyStepPageNumber(studyID: FMSId, stepOrderID: FMSId, tabSelection: StudyStepSamplesTabSelection, pageNumber: number) {
	return async (dispatch: AppDispatch) => {
		dispatch(setStudyStepPageNumberLight(studyID, stepOrderID, tabSelection, pageNumber))

		dispatch(setStudyStepFetchingAtTab(studyID, stepOrderID, tabSelection, true))
		await dispatch(refreshSamplesAtStepOrder(studyID, stepOrderID))
		dispatch(setStudyStepFetchingAtTab(studyID, stepOrderID, tabSelection, false))
	}
}

export function setStudyStepFetching(studyID: FMSId, stepOrderID: FMSId, isFetching: boolean) {
	return async (dispatch: AppDispatch) => {
		dispatch(setStudyStepFetchingAtTab(studyID, stepOrderID, 'ready', isFetching))
		dispatch(setStudyStepFetchingAtTab(studyID, stepOrderID, 'completed', isFetching))
		dispatch(setStudyStepFetchingAtTab(studyID, stepOrderID, 'removed', isFetching))
	}
}


function setStudyStepFetchingAtTab(studyID: FMSId, stepOrderID: FMSId, tabSelection: StudyStepSamplesTabSelection, isFetching: boolean) {
	return {
		type: SET_STUDY_STEP_FETCHING,
		studyID,
		stepOrderID,
		tabSelection,
		isFetching
	}
}

export default {
	getStudySamples,
	flushStudySamples,
	setHideEmptySteps,
}
