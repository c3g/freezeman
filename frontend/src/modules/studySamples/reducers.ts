import { AnyAction } from "redux"
import { removeFilterReducer, setFilterOptionsReducer, setFilterReducer } from "../../components/shared/WorkflowSamplesTable/FilterReducers"
import { createNetworkActionTypes } from "../../utils/actions"
import { StudySamplesState, StudyUXSettings, StudyUXStepSettings } from "./models"

// Define action types in the reducer to avoid a circular dependency between
// the redux store ('store') and the actions. store.ts imports all reducers.
// If an action needs to import store, but the reducer imports from the action file
// then we end up with a circular dependency and the app fails to load with a webpack
// module error.
export const GET_STUDY_SAMPLES = createNetworkActionTypes('STUDY_SAMPLES.GET_STUDY_SAMPLES')
export const FLUSH_STUDY_SAMPLES = 'STUDY_SAMPLES.FLUSH_STUDY_SAMPLES'
export const SET_HIDE_EMPTY_STEPS = 'STUDY_SAMPLES.SET_HIDE_EMPTY_STEPS'

// Settings actions
export const INIT_STUDY_SAMPLES_SETTINGS = 'STUDY_SAMPLES.INIT_STUDY_SAMPLES_SETTINGS'
export const SET_STUDY_EXPANDED_STEPS = 'STUDY_SAMPLES.SET_STUDY_EXPANDED_STEPS'
export const SET_STUDY_STEP_SAMPLES_TAB = 'STUDY_SAMPLES.SET_STUDY_SELECTED_SAMPLES_TAB'
export const SET_STUDY_STEP_FILTER = 'STUDY_SAMPLES.SET_STUDY_STEP_FILTER'
export const SET_STUDY_STEP_FILTER_OPTIONS = 'STUDY_SAMPLES.SET_STUDY_STEP_FILTER_OPTION'
export const REMOVE_STUDY_STEP_FILTER = 'STUDY_SAMPLES.REMOVE_STUDY_STEP_FILTER'
export const SET_STUDY_STEP_SORT_ORDER = 'STUDY_SAMPLES.SET_STUDY_STEP_SORT_ORDER'


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


const INITIAL_STATE : StudySamplesState = {
	studySamplesByID: {},
	hideEmptySteps: false,
	studySettingsByID: {}
}

export const studySamples = (
	state: StudySamplesState = INITIAL_STATE,
	action: AnyAction
) : StudySamplesState => {
	switch(action.type) {
		case GET_STUDY_SAMPLES.REQUEST: {
			const studyID = action.meta.studyID
			return {
				...state,
				studySamplesByID: {
					...state.studySamplesByID, 
					[studyID] : {
						isFetching: true
					}
				}
			}
		}

		case GET_STUDY_SAMPLES.RECEIVE: {
			const studyID = action.meta.studyID
			return {
				...state,
				studySamplesByID: {
					...state.studySamplesByID,
					[studyID] : {
						isFetching: false,
						data: action.meta.studySamples
					}
				}
			}
		}

		case GET_STUDY_SAMPLES.ERROR: {
			const studyID = action.meta.studyID
			const studySamples = state.studySamplesByID[studyID]
			if (studySamples) {
				return {
					...state,
					studySamplesByID: {
						...state.studySamplesByID,
						[studyID] : {
							...studySamples,
							isFetching: false,
							error: action.error
						}
					}
				}
			}
			break
		}
		case FLUSH_STUDY_SAMPLES: {
			const newState = {
				...state
			}
			delete newState.studySamplesByID[action.studyID]
			return newState
		}

		case SET_HIDE_EMPTY_STEPS: {
			return {
				...state,
				hideEmptySteps: action.hideEmptySteps
			}
		}

		// Create a new instance of settings for a study if the settings don't already exist.
		case INIT_STUDY_SAMPLES_SETTINGS: {
			const { studyID, stepIDs } = action
			if (studyID && !state.studySettingsByID[studyID]) {

				const stepSettings = {}
				for(const stepID of stepIDs) {
					const settings: StudyUXStepSettings = {
						stepID
					}
					stepSettings[stepID] = settings
				}

				return {
					...state,
					studySettingsByID: {
						...state.studySettingsByID,
						[studyID]: {
							studyID,
							stepSettings
						}
					}
				}
			} else {
				return state
			}
			break
		}

		case SET_STUDY_EXPANDED_STEPS: {
			// Ant Design gives us the list of expanded panels in its onChange method.
			// Go through the list of expanded steps and update the expanded state
			// of each step.
			const { studyID, stepIDs } = action

			if (state.studySettingsByID[studyID]) {
				const studySettings: StudyUXSettings = {
					...state.studySettingsByID[studyID],
					stepSettings: {...state.studySettingsByID[studyID].stepSettings}
				}

				for (const stepID in studySettings.stepSettings) {
					let stepSettings: StudyUXStepSettings
					if (studySettings.stepSettings[stepID]) {
						stepSettings = studySettings.stepSettings[stepID]
						const isExpanded = (stepIDs as number[]).includes(parseInt(stepID))
						if (stepSettings.expanded !== isExpanded) {
							stepSettings = {
								...stepSettings,
								expanded: isExpanded
							}
						}
						studySettings.stepSettings[stepID] = stepSettings
					} 
				}			

				return {
					...state,
					studySettingsByID: {
						...state.studySettingsByID,
						[studyID]: studySettings
					}
				}
			}
			break
		}
		case SET_STUDY_STEP_SAMPLES_TAB: 
		case SET_STUDY_STEP_FILTER: 
		case SET_STUDY_STEP_FILTER_OPTIONS: 
		case REMOVE_STUDY_STEP_FILTER:
		case SET_STUDY_STEP_SORT_ORDER: {
			return studyUXSettingsReducer(state, action)
		}
	}
	return state
}

function studyUXSettingsReducer(state: StudySamplesState, action: AnyAction) {
	const { studyID, stepID } = action 
	if (studyID && stepID) {
		// StudyUXSettings objects are created on demand
		const studyUXSettings = state.studySettingsByID[studyID]
		let stepUXSettings: StudyUXStepSettings = studyUXSettings.stepSettings[stepID]

		switch(action.type) {
			case SET_STUDY_STEP_SAMPLES_TAB: {
				const { selectedSamplesTab } = action
				if (selectedSamplesTab === 'ready' || selectedSamplesTab === 'completed') {
					stepUXSettings = {
						...stepUXSettings,
						selectedSamplesTab
					}
				}
				break
			}

			case SET_STUDY_STEP_FILTER: {
				const { description, value} = action
				stepUXSettings = {
					...stepUXSettings,
					filters: setFilterReducer(stepUXSettings.filters ?? {}, description, value)
				}
				break
			}

			case SET_STUDY_STEP_FILTER_OPTIONS: {
				const { description, options } = action
				stepUXSettings = {
					...stepUXSettings,
					filters: setFilterOptionsReducer(stepUXSettings.filters ?? {}, description, options)
				}
				break
			}

			case REMOVE_STUDY_STEP_FILTER: {
				const { description } = action
				stepUXSettings = {
					...stepUXSettings,
					filters: removeFilterReducer(stepUXSettings.filters ?? {}, description)
				}
				break
			}

			case SET_STUDY_STEP_SORT_ORDER: {
				const { sortBy } = action
				stepUXSettings = {
					...stepUXSettings,
					sortBy: {
						key: sortBy?.key,
						order: sortBy?.order
					}
				}
				break
			}
		}

		return {
			...state,
			studySettingsByID: {
				...state.studySettingsByID,
				[studyID]: {
					...studyUXSettings,
					stepSettings: {
						...studyUXSettings.stepSettings,
						[stepID]: stepUXSettings
					}
				}
			}
		}
	}
	
	return state
}
