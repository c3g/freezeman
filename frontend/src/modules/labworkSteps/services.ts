import { FMSId } from "../../models/fms_api_models"
import { LabworkPrefilledTemplateDescriptor } from "./models"
import store, { RootState } from "../../store"
import { Protocol } from "../../models/frontend_models"
import { match } from "rambda"

function selectProcessMeasurementTemplateActions(state: RootState) {
	return state.processMeasurementTemplateActions
}

function selectSampleTemplateActions(state: RootState) {
	return state.sampleTemplateActions
}

function selectLibraryTemplateActions(state: RootState) {
	return state.libraryTemplateActions
}

interface TemplateAction {
	id: number
	name: string
	description: string
	template: {
		description: string
		file: string
		protocol?: string
	}[]
}

export function buildSubmitTemplatesURL(protocol: Protocol, templateDescriptor: LabworkPrefilledTemplateDescriptor) : string | undefined {

	function findMatchingAction(templateActions: TemplateAction[], protocolName: string, templateDescription: string) {
		const matchingAction = templateActions.find(action => {
			const matchingTemplate = action.template.find(template => template.protocol === protocol.name && template.description === templateDescriptor.description)
			return !!matchingTemplate
		})
		return matchingAction
	}

	let matchingAction : TemplateAction | undefined

	// Try to find process measurement action.
	const processActions = selectProcessMeasurementTemplateActions(store.getState())
	matchingAction = findMatchingAction(processActions.items, protocol.name, templateDescriptor.description)
	if (matchingAction) {
		return `/process-measurements/actions/${matchingAction.id}`
	}

	// Try to find sample action
	const sampleActions = selectSampleTemplateActions(store.getState())
	matchingAction = findMatchingAction(sampleActions.items, protocol.name, templateDescriptor.description)
	if (matchingAction) {
		return `/samples/actions/${matchingAction.id}`
	}

	// Try to find library action
	const libraryActions = selectLibraryTemplateActions(store.getState())
	matchingAction = findMatchingAction(libraryActions.items, protocol.name, templateDescriptor.description)
	if (matchingAction) {
		return `/libraries/actions/${matchingAction.id}`
	}

	return undefined
}