import { AnyAction } from "redux"
import { ExperimentRunLanes, ExperimentRunLanesState, ExperimentRunLanesUX, LaneInfo } from "./models"
import produce, { Draft } from "immer"

export const SET_EXPERIMENT_LANES = 'EXPERIMENT_RUN_LANES:SET_EXPERIMENT_LANES'
export const SET_READS_PER_SAMPLE = 'EXPERIMENT_RUN_LANES:SET_READS_PER_SAMPLE'
export const SET_LANE_VALIDATION_STATUS = 'EXPERIMENT_RUN_LANES:SET_LANE_VALIDATION_STATUS'
export const FLUSH_EXPERIMENT_LANES = 'EXPERIMENT_RUN_LANES:FLUSH_EXPERIMENT_LANES'
export const SET_EXPANDED_LANES = 'EXPERIMENT_RUN_LANES:SET_EXPANDED_LANES'


const INITIAL_STATE : ExperimentRunLanesState = {
	runs: {},
	ux: {}
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

		case SET_LANE_VALIDATION_STATUS: {
			const { experimentRunName, laneNumber, status} = action
			const experimentRunLanes = state.runs[experimentRunName] as ExperimentRunLanes
			if (experimentRunLanes) {
				const lane = experimentRunLanes.lanes.find(x => x.laneNumber === laneNumber)
				if (lane) {
					lane.validationStatus = status
				}
			}
			break 
		}

		case FLUSH_EXPERIMENT_LANES: {
			const { experimentRunName } = action
			delete state.runs[experimentRunName]
			break
		}

		case SET_EXPANDED_LANES: {
			// Update the expansion state of the lanes, given the list of currently expanded lanes
			const { experimentRunName, expandedLaneNumbers } = action
			let experimentLanesUX = state.ux[experimentRunName] as ExperimentRunLanesUX
			if (!experimentLanesUX) {
				experimentLanesUX = {
					experimentRunName: experimentRunName,
					expandedLanes: []
				}
			}
			experimentLanesUX.expandedLanes = expandedLaneNumbers
			state.ux[experimentRunName] = experimentLanesUX
			break 
		}
	}

	return state
}
