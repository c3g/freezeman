import { FMSId } from "../../models/fms_api_models"
import { FilterSet, SortBy } from "../../models/paged_items"
import { FetchedState } from "../common"

export interface CompletedStudySample {
	readonly id: FMSId							// StepHistory ID 
	readonly sampleID: FMSId
	readonly generatedSampleID?: FMSId
	readonly processID?: FMSId
	readonly processMeasurementID?: FMSId
	readonly executionDate?: string
	readonly executedBy?: string
	readonly comment?: string
}

export interface StudySampleStep {
	readonly stepID:	FMSId						// step ID
	readonly stepName: string					// step name
	readonly stepOrderID: FMSId      			// step order ID
	readonly stepOrder: number					// step order
	readonly protocolID: FMSId					// protocol ID
	readonly sampleCount: number				// Total number of samples ready for processing, regardless of filters
	readonly samples: FMSId[]					// List of (filtered) samples at step
	readonly completedCount: number				// Total number of completed samples, regardless of filters
	readonly completed: CompletedStudySample[]	// Sample history for samples completed at the step
}

export interface StudySampleList {
	readonly steps: StudySampleStep[]
}

export type StudySamplesByID = {[key: number] : Readonly<FetchedState<StudySampleList>>}

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

export type StudySettingsByID = {[key: number] : StudyUXSettings}

// Complete study samples state
export interface StudySamplesState {
	readonly studySamplesByID:  StudySamplesByID			// Object where keys are study IDs and values are StudySampleList objects
	readonly hideEmptySteps: boolean						// Global flag to show or hide empty steps in study detail pages
	readonly studySettingsByID: StudySettingsByID
}