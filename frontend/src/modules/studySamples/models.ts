import { SampleAndLibrary } from "../../components/WorkflowSamplesTable/ColumnSets"
import { FMSId, FMSSampleNextStepByStudy, FMSStepHistory, WorkflowStepOrder } from "../../models/fms_api_models"
import { Sample } from "../../models/frontend_models"
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
	readonly stepID:	FMSId					// step ID
	readonly stepName: string					// step name
	readonly stepOrderID: FMSId      			// step order ID
	readonly stepOrder: number					// step order
	readonly protocolID: FMSId					// protocol ID
	readonly ready: {
		count: number,
		samples: SampleAndLibrary[]
	}
	readonly completed: {
		count: number,
		samples: CompletedStudySample[]
	}
	readonly removed : {
		count: number,
		samples: CompletedStudySample[]
	}
	readonly sampleNextStepByID: { [key: Sample['id']]: FMSSampleNextStepByStudy['id'] }
}

// List of steps
export interface StudySampleList {
	readonly steps: StudySampleStep[]
}

export type StudySamplesByID = {[key: number] : Readonly<FetchedState<StudySampleList>>}	// key: Study ID

// UX settings for study samples page, used to keep track of
// the expanded/collapsed state of steps, the 'ready' vs. 'completed'
// tab selection, and the filtering and sorting values.

// Tab key values
export type StudyStepSamplesTabSelection = 'ready' | 'completed' | 'removed'

// Settings for one step
export interface StudyUXStepSettings {
	readonly stepOrderID: FMSId
	readonly pageSize: number
	readonly expanded?: boolean
	readonly selectedSamplesTab?: StudyStepSamplesTabSelection
	readonly filters?: FilterSet
	readonly sortBy?: SortBy
}

// Settings for one study
export interface StudyUXSettings {
	readonly studyID: FMSId
	readonly stepSettings: {[key : number] : StudyUXStepSettings | undefined }	// key: step order
}

export type StudySettingsByID = {[key: number] : StudyUXSettings | undefined }

export interface StudyStepSamplesTableState {
	pageNumber: number
}

export interface CompletedSamplesTableState {
	pageNumber: number
}

// Complete study samples state
export interface StudySamplesState {
	readonly studySamplesByID:  StudySamplesByID			// Object where keys are study IDs and values are StudySampleList objects
	readonly hideEmptySteps: boolean						// Global flag to show or hide empty steps in study detail pages
	readonly studySettingsByID: StudySettingsByID
	readonly studyTableStatesByID: {
		[studyID: number]: {
			steps: {
				[stepOrderID: number]: {
					tables: {
						readonly ready: StudyStepSamplesTableState
						readonly completed: CompletedSamplesTableState
						readonly removed: CompletedSamplesTableState					
					}
				} | undefined
			}
		} | undefined
	}
}
