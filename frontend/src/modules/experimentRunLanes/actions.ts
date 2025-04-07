import { FMSId } from "../../models/fms_api_models"
import { AppDispatch, RootState } from "../../store"
import api from "../../utils/api"
import { ValidationStatus } from "./models"
import { LaneInfo, LaneNumber } from "./models"
import { FLUSH_EXPERIMENT_LANES, SET_EXPANDED_LANES, SET_EXPERIMENT_LANES, SET_LANE_VALIDATION_STATUS, SET_LANE_VALIDATION_TIME, SET_READS_PER_SAMPLE } from "./reducers"
import { fetchReadsPerSample, loadExperimentRunLanes } from "./services"


export function initExperimentRunLanes(experimentRunId: FMSId){
	return async (dispatch: AppDispatch) => {
		const lanes = await dispatch(loadExperimentRunLanes(experimentRunId))
		dispatch({
			type: SET_EXPERIMENT_LANES,
			lanes
		})
	}
}

export function loadReadsPerSample(experimentRunId: FMSId, lane: LaneNumber) {
	return async (dispatch) => {
		const readsPerSample = await fetchReadsPerSample(experimentRunId, lane)
		dispatch({
			type: SET_READS_PER_SAMPLE,
			experimentRunId,
			lane,
			readsPerSample
		})
	}
}

export function setRunLaneValidationStatus(lane: LaneInfo, status: ValidationStatus) {
	return async (dispatch) => {
		const response = await(dispatch(api.experimentRuns.setLaneValidationStatus(lane.experimentRunId, lane.laneNumber, status)))
		if (response.ok) {
			// NOTE: Loading experiment runs is expensive so, rather than reloading
			// everything from the server, we just update the lane's status in the redux store.
			dispatch({
				type: SET_LANE_VALIDATION_STATUS,
				experimentRunId: lane.experimentRunId,
				laneNumber: lane.laneNumber,
				status: status
			})
		}
	}
}

export function setRunLaneValidationTime(lane: LaneInfo) {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const validationTime = lane.datasets.reduce<string | undefined>((latest, dataset) => {
      const currentDatasetTime = getState().datasets.itemsByID[dataset.datasetID].latest_validation_update
      if (currentDatasetTime) {
          if (!latest || currentDatasetTime > latest) {
            return currentDatasetTime
          }
      }
      return latest
    }, undefined)
    // NOTE: Loading experiment runs is expensive so, rather than reloading
    // everything from the server, we just update the lane's validation time in the redux store.
    dispatch({
      type: SET_LANE_VALIDATION_TIME,
      experimentRunId: lane.experimentRunId,
      laneNumber: lane.laneNumber,
      validationTime: validationTime
    })
  }
}

export function flushExperimentRunLanes(experimentRunId: FMSId) {
	return {
		type: FLUSH_EXPERIMENT_LANES,
		experimentRunId
	}
}

export function setExpandedLanes(experimentRunId: FMSId, expandedLaneNumbers: number[]) {
	return {
		type: SET_EXPANDED_LANES,
		experimentRunId,
		expandedLaneNumbers
	}
}