import { AnyAction } from "redux";
import { FetchedState } from "../common";
import STUDY_SAMPLES from './actions'
import { StudySampleList } from "./models"

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
		case STUDY_SAMPLES.GET_STUDY_SAMPLES.REQUEST: {
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

		case STUDY_SAMPLES.GET_STUDY_SAMPLES.RECEIVE: {
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

		case STUDY_SAMPLES.GET_STUDY_SAMPLES.ERROR: {
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
		case STUDY_SAMPLES.FLUSH_STUDY_SAMPLES: {
			const newState = {
				...state
			}
			delete newState.studySamplesById[action.studyID]
			return newState
		}

		case STUDY_SAMPLES.SET_HIDE_EMPTY_STEPS: {
			return {
				...state,
				hideEmptySteps: action.hideEmptySteps
			}
		}
	}
	return state
}