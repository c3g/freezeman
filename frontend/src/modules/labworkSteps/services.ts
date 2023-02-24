import { Protocol } from "../../models/frontend_models"
import { LabworkPrefilledTemplateDescriptor } from "./models"
import { selectProcessMeasurementTemplateActions, selectSampleTemplateActions, selectLibraryTemplateActions } from '../../selectors'
import { RootState } from "../../store"

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

export function buildSubmitTemplatesURL(state: RootState, protocol: Protocol, templateDescriptor: LabworkPrefilledTemplateDescriptor) : string | undefined {

	function findMatchingAction(templateActions: TemplateAction[], protocolName: string, templateDescription: string) {
		const matchingAction = templateActions.find(action => {
			const matchingTemplate = action.template.find(template => template.protocol === protocolName && template.description === templateDescription)
			return !!matchingTemplate
		})
		return matchingAction
	}

	let matchingAction : TemplateAction | undefined

	// Try to find process measurement action.
	const processActions = selectProcessMeasurementTemplateActions(state)
	matchingAction = findMatchingAction(processActions.items, protocol.name, templateDescriptor.description)
	if (matchingAction) {
		return `/process-measurements/actions/${matchingAction.id}`
	}

	// Try to find sample action
	const sampleActions = selectSampleTemplateActions(state)
	matchingAction = findMatchingAction(sampleActions.items, protocol.name, templateDescriptor.description)
	if (matchingAction) {
		return `/samples/actions/${matchingAction.id}`
	}

	// Try to find library action
	const libraryActions = selectLibraryTemplateActions(state)
	matchingAction = findMatchingAction(libraryActions.items, protocol.name, templateDescriptor.description)
	if (matchingAction) {
		return `/libraries/actions/${matchingAction.id}`
	}

	return undefined
}