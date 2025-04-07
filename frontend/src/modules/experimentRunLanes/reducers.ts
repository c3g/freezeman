import { AnyAction } from "redux"
import { ExperimentRunLanes, ExperimentRunLanesState, ExperimentRunLanesUX } from "./models"
import produce, { Draft } from "immer"

export const SET_EXPERIMENT_LANES = 'EXPERIMENT_RUN_LANES:SET_EXPERIMENT_LANES'
export const SET_READS_PER_SAMPLE = 'EXPERIMENT_RUN_LANES:SET_READS_PER_SAMPLE'
export const SET_LANE_VALIDATION_STATUS = 'EXPERIMENT_RUN_LANES:SET_LANE_VALIDATION_STATUS'
export const SET_LANE_VALIDATION_TIME = 'EXPERIMENT_RUN_LANES:SET_LANE_VALIDATION_TIME'
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
			lanes.lanes.sort((a, b) => a.laneNumber - b.laneNumber)
			state.runs[lanes.experimentRunId] = lanes
			break
		}

		case SET_READS_PER_SAMPLE: {
			const { experimentRunId, lane, readsPerSample } = action
			const experimentRunLanes = state.runs[experimentRunId] as ExperimentRunLanes
			if (experimentRunLanes) {
				const readsLane = experimentRunLanes.lanes.find(x => x.laneNumber === lane)
				if (readsLane) {
					readsLane.readsPerSample = readsPerSample
				}
			}
			break
		}

		case SET_LANE_VALIDATION_STATUS: {
			const { experimentRunId, laneNumber, status} = action
			const experimentRunLanes = state.runs[experimentRunId] as ExperimentRunLanes
			if (experimentRunLanes) {
				const lane = experimentRunLanes.lanes.find(x => x.laneNumber === laneNumber)
				if (lane) {
					lane.validationStatus = status
				}
			}
			break 
		}

    case SET_LANE_VALIDATION_TIME: {
      const { experimentRunId, laneNumber, validationTime} = action
      const experimentRunLanes = state.runs[experimentRunId] as ExperimentRunLanes
      if (experimentRunLanes) {
        const lane = experimentRunLanes.lanes.find(x => x.laneNumber === laneNumber)
        if (lane) {
          lane.validationTime = validationTime
        }
      }
      break 
    }

		case FLUSH_EXPERIMENT_LANES: {
			const { experimentRunId } = action
			delete state.runs[experimentRunId]
			break
		}

		case SET_EXPANDED_LANES: {
			// Update the expansion state of the lanes, given the list of currently expanded lanes
			const { experimentRunId, expandedLaneNumbers } = action
			let experimentLanesUX = state.ux[experimentRunId] as ExperimentRunLanesUX
			if (!experimentLanesUX) {
				experimentLanesUX = {
					experimentRunId,
					expandedLanes: []
				}
			}
			experimentLanesUX.expandedLanes = expandedLaneNumbers
			state.ux[experimentRunId] = experimentLanesUX
			break 
		}
	}

	return state
}
