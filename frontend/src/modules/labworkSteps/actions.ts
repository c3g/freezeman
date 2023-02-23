import { FMSId, FMSPagedResultsReponse, FMSSampleNextStep } from "../../models/fms_api_models"
import Sample from "../samples/actions.js"
import api from "../../utils/api"
import { createNetworkActionTypes, networkAction } from "../../utils/actions"
import { selectPageSize, selectProtocolsByID, selectStepsByID } from "../../selectors"
import { LabworkPrefilledTemplateDescriptor } from "./models"
import { buildSubmitTemplatesURL } from "./services"


export const INIT_SAMPLES_AT_STEP = 'SAMPLES_AT_STEP:INIT_SAMPLES_AT_STEP'
export const LIST = createNetworkActionTypes('LABWORK_STEP')
export const SELECT_SAMPLES = 'SAMPLES_AT_STEP:SELECT_SAMPLES'
export const DESELECT_SAMPLES = 'SAMPLES_AT_STEP:DESELECT_SAMPLES'
export const FLUSH_SAMPLES_AT_STEP = 'SAMPLES_AT_STEP:LOAD_SAMPLES_AT_STEP'

// Initialize the redux state for samples at step
export function initSamplesAtStep(stepID: FMSId) {
	return async (dispatch, getState) => { 
		const stepsByID = selectStepsByID(getState())
		const protocolsByID = selectProtocolsByID(getState())

		const step = stepsByID[stepID]
		if (!step) {
			throw Error(`Step with ID ${stepID} could not be found in store.`)
		}

		const protocol = protocolsByID[step.protocol_id]
		if(! protocol) {
			throw Error(`Protocol with ID ${step.protocol_id} from step ${step.name} could not be found in store.`)
		} 

		const templatesResponse = await dispatch(api.sampleNextStep.prefill.templates(protocol.id))
		if (templatesResponse && templatesResponse.data.length > 0) {
			// dispatch an action to init the state for this step
			await dispatch({
				type: INIT_SAMPLES_AT_STEP,
				stepID,
				templates: templatesResponse.data.map((templateItem : LabworkPrefilledTemplateDescriptor) => {
					const submissionURL = buildSubmitTemplatesURL(getState(), protocol, templateItem)
					return {
						...templateItem,
						submissionURL
					}
				})
			})

			await dispatch(loadSamplesAtStep(stepID, 1))
		} else {
			throw Error(`Failed to fetch templates for step ${step.name} and protocol ${protocol.name}`)
		}

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

// export default {
// 	INIT_SAMPLES_AT_STEP,
// 	LIST,
// 	SELECT_SAMPLES,
// 	DESELECT_SAMPLES,
// 	FLUSH_SAMPLES_AT_STEP,
// 	initSamplesAtStep,
// 	loadSamplesAtStep,
// 	selectStepSamples,
// 	deselectStepSamples,
// 	flushSamplesAtStep,
// }