import { FMSId, FMSPagedResultsReponse, FMSSampleNextStep, FMSTemplateAction } from "../../models/fms_api_models"
import { selectPageSize, selectProtocolsByID, selectStepsByID } from "../../selectors"
import { RootState } from "../../store"
import { createNetworkActionTypes, networkAction } from "../../utils/actions"
import api from "../../utils/api"
import Sample from "../samples/actions.js"
import { LabworkPrefilledTemplateDescriptor } from "./models"


export const INIT_SAMPLES_AT_STEP = 'SAMPLES_AT_STEP:INIT_SAMPLES_AT_STEP'
export const LIST = createNetworkActionTypes('LABWORK_STEP')
export const SET_SELECTED_SAMPLES = 'SAMPLES_AT_STEP:SET_SELECTED_SAMPLES'
export const FLUSH_SAMPLES_AT_STEP = 'SAMPLES_AT_STEP:LOAD_SAMPLES_AT_STEP'
export const LIST_TEMPLATE_ACTIONS = createNetworkActionTypes("SAMPLES_AT_STEP.LIST_TEMPLATE_ACTIONS")

const selectSampleNextStepTemplateActions = (state: RootState) => state.sampleNextStepTemplateActions.items

// Initialize the redux state for samples at step
export function initSamplesAtStep(stepID: FMSId) {
	return async (dispatch, getState) => { 
		const stepsByID = selectStepsByID(getState())
		const protocolsByID = selectProtocolsByID(getState())

		// Get the step by step ID from redux
		const step = stepsByID[stepID]
		if (!step) {
			throw Error(`Step with ID ${stepID} could not be found in store.`)
		}

		// Get the step's protocol
		const protocol = protocolsByID[step.protocol_id]
		if(! protocol) {
			throw Error(`Protocol with ID ${step.protocol_id} from step ${step.name} could not be found in store.`)
		}
		
		// Request the list of template actions for the protocol
		const templateActions = selectSampleNextStepTemplateActions(getState())

		// Request the list of templates for the protocol
		const templatesResponse = await dispatch(api.sampleNextStep.prefill.templates(protocol.id))

		// Convert templates to a list of template descriptors, which include a 'Submit Templates' url.
		const templates = templatesResponse.data.map((templateItem: LabworkPrefilledTemplateDescriptor) => {

			// Find the action ID for the template
			const templateAction = templateActions.find((action) => {
				const matchedTemplate = action.template.find(actionTemplate => actionTemplate.description === templateItem.description)
				return !!matchedTemplate
			})

			const submissionURL = templateAction ? `actions/${templateAction.id}` : undefined
			return {
				...templateItem,
				submissionURL
			}
		})

		// dispatch an action to init the state for this step
		await dispatch({
			type: INIT_SAMPLES_AT_STEP,
			stepID,
			templates
		})

		// Now load the samples for the step
		await dispatch(loadSamplesAtStep(stepID, 1))
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

export function setSelectedSamples(stepID: FMSId, sampleIDs: FMSId[]) {
	return {
		type: SET_SELECTED_SAMPLES,
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

export const listTemplateActions = () => (dispatch, getState) => {
    if (getState().sampleNextStepTemplateActions.isFetching) return;
    return dispatch(networkAction(LIST_TEMPLATE_ACTIONS, api.sampleNextStep.template.actions()));
};
