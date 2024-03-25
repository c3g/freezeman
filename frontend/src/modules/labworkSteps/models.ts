import { FMSId, LabworkStepInfo, SampleLocator } from "../../models/fms_api_models"
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
	selectedSamples: {
		isFetching: boolean
		isSorted: boolean
		sortDirection: CoordinateSortDirection
		items: FMSId[]
	}
	prefill: {
		templates: LabworkPrefilledTemplateDescriptor[],	// The resulting list, or an empty array
	}
	action: {
		templates: LabworkPrefilledTemplateDescriptor[],	// The resulting list, or an empty array
	}
	showSelectionChangedWarning: boolean					// If true, a warning is displayed that the selected samples were changed during refresh
}

type LabworkStepInfoGroup = LabworkStepInfo["results"]["samples"]["groups"][number]

export interface LabworkStepSamplesGroup extends Pick<LabworkStepInfoGroup, 'name' | 'count'> {
  containers: any
  sample_locators: Record<FMSId, SampleLocator | undefined>
  selected_samples: Record<FMSId, SampleLocator | undefined>
}
