import { FMSId } from "../../models/fms_api_models"
import { FilterSet, SortBy } from "../../models/paged_items"
import { FetchedState } from "../common"


export interface StudySampleList {
	sampleList: FMSId[]
	steps: StudySampleStep[]
}

export interface CompletedStudySample {
	id: FMSId							// StepHistory ID 
	sampleID: FMSId
	generatedSampleID?: FMSId
	processID?: FMSId
	processMeasurementID?: FMSId
	executionDate?: string
	executedBy?: string
	comment?: string
}

export interface StudySampleStep {
	stepID:	FMSId						// step ID
	stepName: string					// step name
  	stepOrderID: FMSId      			// step order ID
	stepOrder: number					// step order
	protocolID: FMSId					// protocol ID
	samples: FMSId[]					// List of samples at step
	completed: CompletedStudySample[]	// Sample history for samples completed at the step
}

// UX settings for study samples page, used to keep track of
// the expanded/collapsed state of steps, the 'ready' vs. 'completed'
// tab selection, and the filtering and sorting values.

// Tab key values
export type StudyStepSamplesTabSelection = 'ready' | 'completed'

// Settings for one step
export interface StudyUXStepSettings {
	readonly stepID: FMSId
	readonly expanded?: boolean
	readonly selectedSamplesTab?: StudyStepSamplesTabSelection
	readonly filters?: FilterSet
	readonly sortBy?: SortBy
}

// Settings for one study
export interface StudyUXSettings {
	readonly studyID: FMSId
	readonly stepSettings: {[key : FMSId] : StudyUXStepSettings}	// key: step ID
}

export type StudySamplesByID = {[key: number] : FetchedState<StudySampleList>}
export type StudySettingsByID = {[key: number] : StudyUXSettings}

// Complete study samples state
export interface StudySamplesState {
	readonly studySamplesByID:  StudySamplesByID			// Object where keys are study IDs and values are StudySampleList objects
	readonly hideEmptySteps: boolean						// Global flag to show or hide empty steps in study detail pages
	readonly studySettingsByID: StudySettingsByID
}