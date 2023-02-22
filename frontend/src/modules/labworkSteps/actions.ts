import { FMSId, FMSPagedResultsReponse, FMSSampleNextStep } from "../../models/fms_api_models"
import Sample from "../samples/actions.js"

import api from "../../utils/api"
import { createNetworkActionTypes, networkAction } from "../../utils/actions"
import { selectPageSize } from "../../selectors"
import { LabworkPrefilledTemplateDescriptor, LabworkStepSamples } from "./models"

// Actions
// 	Set step and template info
// 	List paged samples
// 	Set selected tab
//	Set filter
//	Set sorting
//	Flush step state
// 	Select samples
//	Deselect samples
//	Select all samples
//	Deselect all samples

const INIT_SAMPLES_AT_STEP = 'SAMPLES_AT_STEP:INIT_SAMPLES_AT_STEP'
const LIST = createNetworkActionTypes('LABWORK_STEP')
const SELECT_SAMPLES = 'SAMPLES_AT_STEP:SELECT_SAMPLES'
const DESELECT_SAMPLES = 'SAMPLES_AT_STEP:DESELECT_SAMPLES'
const FLUSH_SAMPLES_AT_STEP = 'SAMPLES_AT_STEP:LOAD_SAMPLES_AT_STEP'
const LIST_TEMPLATES = createNetworkActionTypes('SAMPLES_AT_STEP:LOAD_TEMPLATES')


// Initialize the redux state for samples at step
export function initSamplesAtStep(stepID: FMSId) {
	return async (dispath, getState) => {
		 
	}
}

export function loadSamplesAtStep(stepID: FMSId, pageNumber: number) {
	return async (dispatch, getState) => {
		// Get the next page of SampleNextSteps 
		const limit = selectPageSize(getState())
		const offset = limit * (pageNumber - 1)

		const options = {
			limit,
			offset,
			meta : {
				stepID,
				pageNumber
			}
		}
		const response : FMSPagedResultsReponse<FMSSampleNextStep> = await dispatch(networkAction(LIST, api.sampleNextStep.listSamplesAtStep(stepID, {}), options))
		if (response.count > 0) {
			// Load the associated samples/libraries
			const sampleIDs = response.results.map(nextStep => nextStep.sample)
			const options = {id__in: sampleIDs.join(',')}
			dispatch(Sample.list(options))
		}
	}
}

export function listTemplates(stepID: FMSId, protocolID: FMSId) {
	return async (dispatch, getState) => {
		const options = {
			meta: {
				stepID,
				protocolID,
			}
		}
		const response : LabworkPrefilledTemplateDescriptor[] = await dispatch(networkAction(LIST_TEMPLATES, api.sampleNextStep.prefill.templates(protocolID), options))
		return response
	}
}


export function selectStepSamples(stepID: FMSId, sampleIDs: FMSId[]) {
	return {
		type: SELECT_SAMPLES,
		stepID,
		sampleIDs
	}
}

export function deselectStepSamples(stepID: FMSId, sampleIDs: FMSId[]) {
	return {
		type: DESELECT_SAMPLES,
		stepID,
		sampleIDs
	}
}

export function flushSamplesAtStep(stepID: FMSId) {
	return {
		type: FLUSH_SAMPLES_AT_STEP,
		stepID
	}
}

export default {
	LIST,
	SELECT_SAMPLES,
	DESELECT_SAMPLES,
	FLUSH_SAMPLES_AT_STEP,
	LIST_TEMPLATES,
	loadSamplesAtStep,
	selectStepSamples,
	deselectStepSamples,
	flushSamplesAtStep,
	listTemplates,
}