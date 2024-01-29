import { FMSId } from "../../models/fms_api_models"
import { SampleNextStep } from "../../models/frontend_models"
import { PagedItemsByID } from "../../models/paged_items"

export interface LabworkStepsState {
	steps: {[key: FMSId] : LabworkStepSamples}			// key is a Step ID
}

export interface LabworkStepSummaryState {
	isFetching: boolean
  groups?: LabworkStepSamplesGroup[]
	error?: any
}

export interface LabworkPrefilledTemplateDescriptor {
	id: number
	description: string
	submissionURL?: string
	prefillFields: any
}

export interface CoordinateSortDirection {
	orientation: 'column' | 'row'
	order: 'ascend' | 'descend'
}

export interface LabworkStepSamples {
	stepID: FMSId											// Step ID (get the step from the labwork summary state)
	pagedItems: PagedItemsByID<SampleNextStep>					// Page of SampleNextStep objects
	displayedSamples: FMSId[]								// Samples displayed in table
	selectedSamples: FMSId[]								// Currently selected samples
	selectedSamplesSortDirection: CoordinateSortDirection	// Control sample coordinate sort order by column or by row
	prefill: {
		templates: LabworkPrefilledTemplateDescriptor[],	// The resulting list, or an empty array
	}
  action: {
    templates: LabworkPrefilledTemplateDescriptor[],	// The resulting list, or an empty array
  }
	showSelectionChangedWarning: boolean					// If true, a warning is displayed that the selected samples were changed during refresh
}

export interface LabworkStepSamplesGroup {
	name: string                      // Name identifying that group
  count: number                     // Number of samples included in group
  sample_locators: SampleLocator[]               // Samples included in group
  containers: any
}

export interface SampleLocator {
  sample_id: FMSId
  contextual_container_barcode: string
  contextual_coordinates: string
}