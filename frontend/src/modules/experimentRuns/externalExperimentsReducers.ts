import { AnyAction } from "redux"
import { ExternalExperimentRun } from "../../models/frontend_models"
import { createNetworkActionTypes } from "../../utils/actions"

export const LIST_EXTERNAL_EXPERIMENTS = createNetworkActionTypes("EXPERIMENT_RUNS.LIST_EXTERNAL_EXPERIMENTS")

interface ExternalExperimentState {
	isFetching: boolean
	runs: ExternalExperimentRun[]
	error?: any
}

const INITIAL_STATE: ExternalExperimentState = {
	isFetching: false,
	runs: [],
}

export function externalExperimentRuns(state: ExternalExperimentState = INITIAL_STATE, action: AnyAction): ExternalExperimentState {
	switch(action.type) {
		case LIST_EXTERNAL_EXPERIMENTS.REQUEST: {
			return {
				...state,
				isFetching: true,
				error: undefined
			}
		}
		case LIST_EXTERNAL_EXPERIMENTS.RECEIVE: {
			return {
				...state,
				isFetching: false,
				runs: action.data
			}
		}
		case LIST_EXTERNAL_EXPERIMENTS.ERROR: {
			return {
				...state,
				isFetching: false,
				error: action.error
			}
		}
	}
	return state
}