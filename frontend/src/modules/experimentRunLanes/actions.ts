import { ItemsByID } from "../../models/frontend_models"
import { AppDispatch } from "../../store"
import api from "../../utils/api"
import { ValidationStatus } from "./models"
import { LaneInfo, LaneNumber } from "./models"
import { Dataset } from '../../models/frontend_models'
import { FLUSH_EXPERIMENT_LANES, SET_EXPANDED_LANES, SET_EXPERIMENT_LANES, SET_LANE_VALIDATION_STATUS, SET_LANE_VALIDATION_TIME, SET_READS_PER_SAMPLE } from "./reducers"
import { fetchReadsPerSample, loadExperimentRunLanes } from "./services"


export function initExperimentRunLanes(experimentRunName: string){
	return async (dispatch: AppDispatch) => {
		const lanes = await dispatch(loadExperimentRunLanes(experimentRunName))
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

export function setRunLaneValidationTime(lane: LaneInfo) {
	return async (dispatch, getState) => {
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
      experimentRunName: lane.runName,
      laneNumber: lane.laneNumber,
      validationTime: validationTime
    })
	}
}

export function flushExperimentRunLanes(experimentRunName: string) {
	return {
		type: FLUSH_EXPERIMENT_LANES,
		experimentRunName
	}
}

export function setExpandedLanes(experimentRunName: string, expandedLaneNumbers: number[]) {
	return {
		type: SET_EXPANDED_LANES,
		experimentRunName,
		expandedLaneNumbers
	}
}