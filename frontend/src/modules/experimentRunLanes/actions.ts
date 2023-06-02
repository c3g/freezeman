import api from "../../utils/api"
import { ValidationStatus } from "./models"
import { LaneInfo, LaneNumber } from "./models"
import { FLUSH_EXPERIMENT_LANES, SET_EXPERIMENT_LANES, SET_LANE_VALIDATION_STATUS, SET_READS_PER_SAMPLE } from "./reducers"
import { fetchReadsPerSample, loadExperimentRunLanes } from "./services"


export function initExperimentRunLanes(experimentRunName: string){
	return async (dispatch) => {
		const lanes = await loadExperimentRunLanes(experimentRunName)
		dispatch({
			type: SET_EXPERIMENT_LANES,
			lanes
		})
	}
}

export function loadReadsPerSample(experimentRunName: string, lane: LaneNumber) {
	return async (dispatch) => {
		const readsPerSample = await fetchReadsPerSample(experimentRunName, lane)
		dispatch({
			type: SET_READS_PER_SAMPLE,
			experimentRunName,
			lane,
			readsPerSample
		})
	}
}

export function setRunLaneValidationStatus(lane: LaneInfo, status: ValidationStatus) {
	return async (dispatch) => {
		const response = await(dispatch(api.experimentRuns.setLaneValidationStatus(lane.runName, lane.laneNumber, status)))
		if (response.ok) {
			// NOTE: Loading experiment runs is expensive so, rather than reloading
			// everything from the server, we just update the lane's status in the redux store.
			dispatch({
				type: SET_LANE_VALIDATION_STATUS,
				experimentRunName: lane.runName,
				laneNumber: lane.laneNumber,
				status: status
			})
		}
	}
}

export function flushExperimentRunLanes(experimentRunName: string) {
	return {
		type: FLUSH_EXPERIMENT_LANES,
		experimentRunName
	}
}