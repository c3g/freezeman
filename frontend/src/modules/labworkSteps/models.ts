import { FMSId } from "../../models/fms_api_models"
import { PagedItems, SampleNextStep } from "../../models/frontend_models"

export interface LabworkStepsState {
	steps: {[key: FMSId] : LabworkStepSamples}			// key is a Step ID
}

export interface LabworkPrefilledTemplateDescriptor {
	id: number
	description: string
	submissionURL?: string
}

export interface LabworkStepSamples {
	stepID: FMSId											// Step ID (get the step from the labwork summary state)
	pagedItems: PagedItems<SampleNextStep>					// Page of SampleNextStep objects
	displayedSamples: FMSId[]								// Samples displayed in table
	selectedSamples: FMSId[]								// Currently selected samples
	prefill: {
		templates: LabworkPrefilledTemplateDescriptor[],	// The resulting list, or an empty array
	}
}

