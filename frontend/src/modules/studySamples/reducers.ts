import { produce } from 'immer'
import { WritableDraft } from 'immer/dist/types/types-external'
import { AnyAction } from 'redux'
import { createNetworkActionTypes } from '../../utils/actions'
import { StudySampleList, StudySamplesState, StudyStepSamplesTabSelection, StudyUXSettings } from './models'
import { clearFilters, removeFilter, setFilterOptions, setFilterValue } from '../../models/filter_set_reducers'
import { FMSId } from '../../models/fms_api_models'

// Define action types in the reducer to avoid a circular dependency between
// the redux store ('store') and the actions. store.ts imports all reducers.
// If an action needs to import store, but the reducer imports from the action file
// then we end up with a circular dependency and the app fails to load with a webpack
// module error.
export const GET_STUDY_SAMPLES = createNetworkActionTypes('STUDY_SAMPLES.GET_STUDY_SAMPLES')
export const SET_REFRESHED_STEP_SAMPLES = 'STUDY_SAMPLES.SET_REFRESHED_STEP_SAMPLES'
export const FLUSH_STUDY_SAMPLES = 'STUDY_SAMPLES.FLUSH_STUDY_SAMPLES'
export const SET_HIDE_EMPTY_STEPS = 'STUDY_SAMPLES.SET_HIDE_EMPTY_STEPS'

// Settings actions
export const INIT_STUDY_SAMPLES_SETTINGS_AND_TABLES = 'STUDY_SAMPLES.INIT_STUDY_SAMPLES_SETTINGS_AND_TABLES'
export const SET_STUDY_EXPANDED_STEPS = 'STUDY_SAMPLES.SET_STUDY_EXPANDED_STEPS'
export const SET_STUDY_STEP_SAMPLES_TAB = 'STUDY_SAMPLES.SET_STUDY_SELECTED_SAMPLES_TAB'
export const SET_STUDY_STEP_FILTER = 'STUDY_SAMPLES.SET_STUDY_STEP_FILTER'
export const SET_STUDY_STEP_FILTER_OPTIONS = 'STUDY_SAMPLES.SET_STUDY_STEP_FILTER_OPTIONS'
export const REMOVE_STUDY_STEP_FILTER = 'STUDY_SAMPLES.REMOVE_STUDY_STEP_FILTER'
export const SET_STUDY_STEP_SORT_ORDER = 'STUDY_SAMPLES.SET_STUDY_STEP_SORT_ORDER'
export const CLEAR_FILTERS = "STUDY_SAMPLES.CLEAR_FILTERS"

// Table actions
export const SET_STUDY_STEP_PAGE_SIZE = 'STUDY_SAMPLES.SET_STUDY_STEP_PAGE_SIZE'
export const SET_STUDY_STEP_PAGE_NUMBER = 'STUDY_SAMPLES.SET_STUDY_STEP_PAGE_NUMBER'
export const SET_STUDY_STEP_FETCHING = 'STUDY_SAMPLES.SET_STUDY_STEP_FETCHING'

/* 
	The studySamples state is used by the study details page to list the
	workflow steps in a study and the samples that are at each step.
	
	The step/samples data are stored as StudySampleList objects.

	To retrieve the StudySampleList for a study from the store, use the
	selector selectStudySamplesByID, then use the study ID as a key to
	get the StudySampleList.

	Example:

	const myStudySamples = useAppSelector(selectStudySamplesByID)[studyID]

	The state also manages a flag that is used to show or hide steps containing
	no samples in the study details page.
*/

const INITIAL_STATE: StudySamplesState = {
	studySamplesByID: {},
	hideEmptySteps: false,
	studySettingsByID: {},
	studyTableStatesByID: {}
}

export function studySamples(inputState: StudySamplesState = INITIAL_STATE, action: AnyAction) {
	// NOTE: This reducer uses 'immer' to simplify the reducer code. It makes the
	// reducer code much easier to understand and maintain. Immer passes a mutable
	// copy of the state to the reducer, so the reducer can simply mutate the state,
	// rather than creating copies of everything. Immer takes care of updating redux with
	// only the parts of the state that have been mutated.
	return produce(inputState, (draft) => {
		return studySamplesReducer(draft, action)
	})
}

export const studySamplesReducer = (state: WritableDraft<StudySamplesState>, action: AnyAction): StudySamplesState => {
	switch (action.type) {
		case GET_STUDY_SAMPLES.REQUEST: {
			const { studyID } = action.meta
			if (state.studySamplesByID[studyID]) {
				state.studySamplesByID[studyID].isFetching = true
			} else {
				// Study state gets created on first REQUEST call
				state.studySamplesByID[studyID] = {
					isFetching: true,
				}
			}
			break
		}

		case GET_STUDY_SAMPLES.RECEIVE: {
			const { studyID, studySamples } = action.meta as { studyID: number, studySamples: StudySampleList }
			if (state.studySamplesByID[studyID]) {
				state.studySamplesByID[studyID].isFetching = false
				state.studySamplesByID[studyID].data = studySamples
			}
			break
		}

		case GET_STUDY_SAMPLES.ERROR: {
			const { studyID } = action.meta
			const { error } = action

			const studySamples = state.studySamplesByID[studyID]
			if (studySamples) {
				studySamples.isFetching = false
				studySamples.error = error
			}
			break
		}

		case SET_REFRESHED_STEP_SAMPLES: {
			const { studyID, stepOrderID, ready, completed, removed } = action
			const studySamples = state.studySamplesByID[studyID]
			if (studySamples?.data?.steps) {
				let stepIndex = studySamples.data.steps.findIndex((step) => step.stepOrderID === stepOrderID)
				if (stepIndex >= 0) {
					studySamples.data.steps[stepIndex] = {
						...studySamples.data.steps[stepIndex],
						ready,
						completed,
						removed
					}
				}
			}
			break
		}

		case FLUSH_STUDY_SAMPLES: {
			const { studyID } = action
			delete state.studySamplesByID[studyID]
			break
		}

		case SET_HIDE_EMPTY_STEPS: {
			const { hideEmptySteps } = action
			state.hideEmptySteps = hideEmptySteps ?? false
			break
		}

		// Create a new instance of settings for a study if the settings don't already exist.
		case INIT_STUDY_SAMPLES_SETTINGS_AND_TABLES: {
			const { studyID, stepOrderIDs } = action

			if (!state.studySettingsByID[studyID]) {
				const studyUXSettings: StudyUXSettings = {
					studyID,
					stepSettings: {},
				}
				for (const stepOrderID of stepOrderIDs) {
					studyUXSettings.stepSettings[stepOrderID] = {
						stepOrderID,
						pageSize: 10
					}
				}
				state.studySettingsByID[studyID] = studyUXSettings
			}
			for (const stepOrderID of stepOrderIDs) {
				const inStudy = state.studyTableStatesByID[studyID] ??= { steps: {} }
				inStudy.steps[stepOrderID] ??= { tables: {
					ready: { pageNumber: 1, isFetching: false },
					completed: { pageNumber: 1, isFetching: false },
					removed: { pageNumber: 1, isFetching: false }
				} }
			}
			break
		}

		case SET_STUDY_EXPANDED_STEPS: {
			// Ant Design gives us the list of expanded panels in its onChange method.
			// Go through the list of expanded steps and update the expanded state
			// of each step.
			const { studyID, stepOrderIDs } = action

			const study = state.studySettingsByID[studyID]
			if (study) {
				for (const stepOrderID in study.stepSettings) {
					const step = study.stepSettings[stepOrderID]
					if (step) {
						const isExpanded = (stepOrderIDs as number[]).includes(parseInt(stepOrderID))
						step.expanded = isExpanded
					}
				}
			}
			break
		}
		case SET_STUDY_STEP_SAMPLES_TAB: {
			const { studyID, stepOrderID, selectedSamplesTab } = action

			if (selectedSamplesTab === 'ready' || selectedSamplesTab === 'completed' || selectedSamplesTab === 'removed') {
				const step = state.studySettingsByID[studyID]?.stepSettings[stepOrderID]
				if (step) {
					step.selectedSamplesTab = selectedSamplesTab
				}
			}
			break
		}
		case SET_STUDY_STEP_FILTER: {
			const { studyID, stepOrderID, description, value } = action
			const step = state.studySettingsByID[studyID]?.stepSettings[stepOrderID]
			if (step) {
				step.filters = setFilterValue(step.filters ?? {}, description, value)
			}
			break
		}

		case SET_STUDY_STEP_FILTER_OPTIONS: {
			const { studyID, stepOrderID, description, options } = action
			const step = state.studySettingsByID[studyID]?.stepSettings[stepOrderID]
			if (step) {
				step.filters = setFilterOptions(step.filters ?? {}, description, options)
			}
			break
		}
		case CLEAR_FILTERS: {
			const { studyID, stepOrderID } = action
			const step = state.studySettingsByID[studyID]?.stepSettings[stepOrderID]
			if (step && step.filters) {
				step.filters = clearFilters(step.filters)
			}
			break
		}

		case REMOVE_STUDY_STEP_FILTER: {
			const { studyID, stepOrderID, description } = action
			const step = state.studySettingsByID[studyID]?.stepSettings[stepOrderID]
			if (step) {
				step.filters = removeFilter(step.filters ?? {}, description)
			}
			break
		}

		case SET_STUDY_STEP_SORT_ORDER: {
			const { studyID, stepOrderID, sortBy } = action
			const step = state.studySettingsByID[studyID]?.stepSettings[stepOrderID]
			if (step) {
				step.sortBy = {
					key: sortBy.key,
					order: sortBy.order,
				}
			}
			break
		}

		case SET_STUDY_STEP_PAGE_SIZE: {
			const { studyID, stepOrderID, pageSize } = action
			const stepSetting = state.studySettingsByID[studyID]?.stepSettings[stepOrderID]
			if (stepSetting) {
				stepSetting.pageSize = pageSize
			}
			break
		}
		case SET_STUDY_STEP_PAGE_NUMBER: {
			const { studyID, stepOrderID, tabSelection, pageNumber } = action
			let tableState = state.studyTableStatesByID[studyID]?.steps[stepOrderID]?.tables[tabSelection as StudyStepSamplesTabSelection]
			if (tableState) {
				tableState.pageNumber = pageNumber
			}
		}
		case SET_STUDY_STEP_FETCHING: {
			const { studyID, stepOrderID, tabSelection, isFetching } = action
			let tableState = state.studyTableStatesByID[studyID]?.steps[stepOrderID]?.tables[tabSelection as StudyStepSamplesTabSelection]
			if (tableState) {
				tableState.isFetching = isFetching
			}
		}
	}
	return state
}
