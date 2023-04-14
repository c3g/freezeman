import { FMSId } from "../../models/fms_api_models"
import { SampleNextStep } from "../../models/frontend_models"
import { PagedItems } from "../../models/paged_items"

export interface LabworkStepsState {
	steps: {[key: FMSId] : LabworkStepSamples}			// key is a Step ID
}

export interface LabworkPrefilledTemplateDescriptor {
	id: number
	description: string
	submissionURL?: string
}

export type CoordinateSortDirection = 'column' | 'row'

export interface LabworkStepSamples {
	stepID: FMSId											// Step ID (get the step from the labwork summary state)
	pagedItems: PagedItems<SampleNextStep>					// Page of SampleNextStep objects
	displayedSamples: FMSId[]								// Samples displayed in table
	selectedSamples: FMSId[]								// Currently selected samples
	selectedSamplesSortDirection: CoordinateSortDirection	// Control sample coordinate sort order by column or by row
	prefill: {
		templates: LabworkPrefilledTemplateDescriptor[],	// The resulting list, or an empty array
	}
	showSelectionChangedWarning: boolean						// If true, a warning is displayed that the selected samples were changed during refresh

}

