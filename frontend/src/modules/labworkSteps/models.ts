import { FMSId } from "../../models/fms_api_models"
import { FetchedObject, ItemsByID, PagedItems, Sample, SampleNextStep } from "../../models/frontend_models"
import { LabworkSummaryStep } from "../../models/labwork_summary"
import { RootState } from "../../store"

export interface LabworkStepsState {
	steps: {[key: FMSId] : LabworkStepSamples}
}

export interface LabworkStepSamples {
	stepID: FMSId							// Step ID (get the step from the labwork summary state)
	pagedItems: PagedItems<SampleNextStep>	// Page of SampleNextStep objects
	displayedSamples: FMSId[]				// Samples displayed in table
	selectedSamples: FMSId[]				// Currently selected samples
}

