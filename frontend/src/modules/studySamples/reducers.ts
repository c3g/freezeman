import { AnyAction } from "redux";
import { createNetworkActionTypes } from "../../utils/actions"
import { FetchedState } from "../common"
import { StudySampleList } from "./models"

// Define action types in the reducer to avoid a circular dependency between
// the redux store ('store') and the actions. store.ts imports all reducers.
// If an action needs to import store, but the reducer imports from the action file
// then we end up with a circular dependency and the app fails to load with a webpack
// module error.
export const GET_STUDY_SAMPLES = createNetworkActionTypes('STUDY_SAMPLES.GET_STUDY_SAMPLES')
export const FLUSH_STUDY_SAMPLES = 'STUDY_SAMPLES.FLUSH_STUDY_SAMPLES'
export const SET_HIDE_EMPTY_STEPS = 'STUDY_SAMPLES.SET_HIDE_EMPTY_STEPS'

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


export type StudySamplesByID = {[key: number] : FetchedState<StudySampleList>}

export interface StudySamplesState {
	studySamplesById:  StudySamplesByID			// Object where keys are study IDs and values are StudySampleList objects
	hideEmptySteps: boolean						// Global flag to show or hide empty steps in study detail pages
}

const INITIAL_STATE : StudySamplesState = {
	studySamplesById: {},
	hideEmptySteps: false
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
				studySamplesById: {
					...state.studySamplesById, 
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
				studySamplesById: {
					...state.studySamplesById,
					[studyID] : {
						isFetching: false,
						data: action.meta.studySamples
					}
				}
			}
		}

		case GET_STUDY_SAMPLES.ERROR: {
			const studyID = action.meta.studyID
			const studySamples = state.studySamplesById[studyID]
			if (studySamples) {
				return {
					...state,
					studySamplesById: {
						...state.studySamplesById,
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
			delete newState.studySamplesById[action.studyID]
			return newState
		}

		case SET_HIDE_EMPTY_STEPS: {
			return {
				...state,
				hideEmptySteps: action.hideEmptySteps
			}
		}
	}
	return state
}