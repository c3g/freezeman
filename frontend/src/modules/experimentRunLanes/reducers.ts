import { AnyAction } from "redux"
import { ExperimentRunLanes, ExperimentRunLanesState } from "./models"
import produce, { Draft } from "immer"

export const SET_EXPERIMENT_LANES = 'EXPERIMENT_RUN_LANES:SET_EXPERIMENT_LANES'
export const SET_READS_PER_SAMPLE = 'EXPERIMENT_RUN_LANES:SET_READS_PER_SAMPLE'


const INITIAL_STATE : ExperimentRunLanesState = {
	runs: {}	
}


export function experimentRunLanes(state: ExperimentRunLanesState = INITIAL_STATE, action: AnyAction): ExperimentRunLanesState {
	return produce(state, draft => {
		return reducers(draft, action)
	})
}


function reducers(state: Draft<ExperimentRunLanesState>, action: AnyAction): ExperimentRunLanesState {
	switch(action.type) {
		
		case SET_EXPERIMENT_LANES: {
			const lanes : ExperimentRunLanes = action.lanes
			state.runs[lanes.experimentRunName] = lanes
			break
		}

		case SET_READS_PER_SAMPLE: {
			const { experimentRunName, lane, readsPerSample } = action
			const experimentRunLanes = state.runs[experimentRunName] as ExperimentRunLanes
			if (experimentRunLanes) {
				const readsLane = experimentRunLanes.lanes.find(x => x.laneNumber === lane)
				if (readsLane) {
					readsLane.readsPerSample = readsPerSample
				}
			}
			break
		}
	}

	return state
}