import { DEFAULT_SMALL_PAGINATION_LIMIT } from '../../config'
import { FMSId } from '../../models/fms_api_models'
import { FilterDescription, FilterOptions, FilterValue, SortBy } from '../../models/paged_items'
import { selectStudiesByID, selectStudySamplesByID, selectStudySettingsByID, selectStudyTableStatesByID, selectWorkflowsByID } from '../../selectors'
import { AppDispatch, RootState } from '../../store'
import { StudySampleStep, StudyStepSamplesTabSelection } from './models'
import { CLEAR_FILTERS, FLUSH_STUDY_SAMPLES, GET_STUDY_SAMPLES, INIT_STUDY_SAMPLES_SETTINGS_AND_TABLES, REMOVE_STUDY_STEP_FILTER, SET_HIDE_EMPTY_STEPS, SET_REFRESHED_STEP_SAMPLES, SET_STUDY_EXPANDED_STEPS, SET_STUDY_STEP_FETCHING, SET_STUDY_STEP_FILTER, SET_STUDY_STEP_FILTER_OPTIONS, SET_STUDY_STEP_PAGE_NUMBER, SET_STUDY_STEP_PAGE_SIZE, SET_STUDY_STEP_SAMPLES_TAB, SET_STUDY_STEP_SORT_ORDER } from './reducers'
import { lazyLoadStudySamplesInStepByStudy, loadStudySamplesInStepByStudy, loadStudySampleStep } from './services'

export function getStudySamples(studyID: FMSId) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		dispatch({ type: GET_STUDY_SAMPLES.REQUEST, meta: { studyID } })
		try {
			let studySamples: StudySampleStep[] = []
			const studiesById = selectStudiesByID(getState())
			const workflowsById = selectWorkflowsByID(getState())
			const studySettings = selectStudySettingsByID(getState())[studyID]

			const study = studiesById[studyID]
			if (study) {
				const workflow = workflowsById[study.workflow_id]
				if (workflow) {
          			const studyStepOrders = workflow.steps_order.filter((x) => (x.order >= study.start) && (x.order <= study.end))
					dispatch(initStudySamplesSettingsAndTables(studyID, studyStepOrders.map((x) => x.id)))
					studySamples = await Promise.all(studyStepOrders.map(async (stepOrder) => {
						dispatch(setStudyStepFetching(studyID, stepOrder.id, true))
						// it's called after initStudySamplesSettingsAndTables so it shouldn't be undefined
						const pageSize = studySettings?.stepSettings[stepOrder.id]?.pageSize ?? DEFAULT_SMALL_PAGINATION_LIMIT
						const result = await loadStudySampleStep(studyID, stepOrder, pageSize)
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

export function refreshSamplesAtStepOrder(studyID: FMSId, stepOrderID: FMSId, tabSelection?: StudyStepSamplesTabSelection) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		dispatch(setStudyStepFetching(studyID, stepOrderID, true, tabSelection))
		
		// it's called after initStudySamplesSettingsAndTables so it shouldn't be undefined
		const pageSize = selectStudySettingsByID(getState())[studyID]?.stepSettings[stepOrderID]?.pageSize ?? DEFAULT_SMALL_PAGINATION_LIMIT

		let studySamplesInStepByStudy: Partial<Pick<StudySampleStep, "ready" | "completed" | "removed">>
		if (tabSelection) {
			const pageNumber = selectStudyTableStatesByID(getState())[studyID]?.steps[stepOrderID]?.tables[tabSelection]?.pageNumber ?? 1
			studySamplesInStepByStudy = { [tabSelection]: await lazyLoadStudySamplesInStepByStudy(studyID, stepOrderID)[tabSelection]((pageNumber - 1) * pageSize, pageSize) }
		} else {
			studySamplesInStepByStudy = await loadStudySamplesInStepByStudy(studyID, stepOrderID, pageSize)
		}
		dispatch({
			type: SET_REFRESHED_STEP_SAMPLES,
			studyID,
			stepOrderID,
			...studySamplesInStepByStudy
		})

		dispatch(setStudyStepFetching(studyID, stepOrderID, false, tabSelection))
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
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		const setting = selectStudySettingsByID(getState())[studyID]?.stepSettings[stepOrderID]
		if (setting?.pageSize === pageSize) {
			return
		}

		dispatch(setStudyStepPageNumberLight(studyID, stepOrderID, 1))
		dispatch({
			type: SET_STUDY_STEP_PAGE_SIZE,
			studyID,
			stepOrderID,
			pageSize
		})
		await dispatch(refreshSamplesAtStepOrder(studyID, stepOrderID))
	}
}

export function setStudyStepPageNumber(studyID: FMSId, stepOrderID: FMSId, tabSelection: StudyStepSamplesTabSelection, pageNumber: number) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		const table = selectStudyTableStatesByID(getState())[studyID]?.steps[stepOrderID]?.tables[tabSelection]
		if (pageNumber === table?.pageNumber) {
			return
		}

		dispatch(setStudyStepPageNumberLight(studyID, stepOrderID, pageNumber, tabSelection))
		await dispatch(refreshSamplesAtStepOrder(studyID, stepOrderID, tabSelection))
	}
}

// set page number without fetching samples
function setStudyStepPageNumberLight(studyID: FMSId, stepOrderID: FMSId, pageNumber: number, tabSelection?: StudyStepSamplesTabSelection) {
	return (dispatch: AppDispatch) => {
		const tabSelections: StudyStepSamplesTabSelection[] = tabSelection ? [tabSelection] : ['ready', 'completed', 'removed']
		tabSelections.forEach((tabSelection) => dispatch({
			type: SET_STUDY_STEP_PAGE_NUMBER,
			studyID,
			stepOrderID,
			tabSelection,
			pageNumber
		}))
	}
}

function setStudyStepFetching(studyID: FMSId, stepOrderID: FMSId, isFetching: boolean, tabSelection?: StudyStepSamplesTabSelection) {
	return (dispatch: AppDispatch) => {
		const tabSelections: StudyStepSamplesTabSelection[] = tabSelection ? [tabSelection] : ['ready', 'completed', 'removed']
		tabSelections.forEach((tabSelection) => dispatch({
			type: SET_STUDY_STEP_FETCHING,
			studyID,
			stepOrderID,
			tabSelection,
			isFetching
		}))
	}
}

export default {
	getStudySamples,
	flushStudySamples,
	setHideEmptySteps,
}
