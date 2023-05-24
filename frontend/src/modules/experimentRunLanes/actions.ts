import { LaneNumber } from "./models"
import { SET_EXPERIMENT_LANES, SET_READS_PER_SAMPLE } from "./reducers"
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