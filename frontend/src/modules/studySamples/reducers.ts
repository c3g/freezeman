import { AnyAction } from "redux";
import { StudySampleList } from "../../models/study_samples";
import { FetchedState } from "../common";
import STUDY_SAMPLES from './actions'

/* 
	The study samples state can handle multiple studies.
	The state uses the study ID as a key, which maps to the study
	samples state for that study.

	To get the study samples do:
		const studySamples = useState(selectStudySamples)[studyID]?.data
*/
export interface StudySamplesState {
	[key: number] : FetchedState<StudySampleList>
}

export const studySamples = (
	state: StudySamplesState = {},
	action: AnyAction
) : StudySamplesState => {
	switch(action.type) {
		case STUDY_SAMPLES.GET_STUDY_SAMPLES.REQUEST: {
			const studyID = action.meta.studyID
			return {...state, [studyID]: {
				isFetching: true,
			}}
		}

		case STUDY_SAMPLES.GET_STUDY_SAMPLES.RECEIVE: {
			const studyID = action.meta.studyID
			return {...state, [studyID]: {
				isFetching: false,
				data: action.meta.studySamples
			}}
		}

		case STUDY_SAMPLES.GET_STUDY_SAMPLES.ERROR: {
			const studyID = action.meta.studyID
			let studySamples = state[studyID]
			if (studySamples) {
				studySamples = {
					...studySamples,
					isFetching: false,
					error: action.error
				}
				return {...state, [studyID]: studySamples}
			}
		}
	}
	return state
}