import { FMSId } from "../../models/fms_api_models"

type ExperimentRunName = string
export type LaneNumber = number

export enum ValidationStatus {
	AVAILABLE = 0,
	PASSED = 1,
	FAILED = 2,
}

export interface DatasetInfo {
	datasetID: FMSId						// The ID of the dataset in the db
	metricsURL?: string						// A link to the run metrics associated with this lane
}

export interface NumberOfReads {
	derivedSampleID?: FMSId						// Sample ID if this is from a freezeman experiment run and the sample is in the DB
	sampleName: string						// Name of the sample
	nbReads : number						// Number of reads for the sample
}

export interface ReadsPerSample {
	// TODO : Is there some kind of sort order for the samples that would be
	// helpful to the lab? 
	sampleReads: NumberOfReads[]
}

export interface LaneInfo {
	runName: string							// Name of the run, for both freezeman and external runs
	laneNumber: LaneNumber					// The number of the lane
	validationStatus: ValidationStatus		// The validation status for the lane
	datasets: DatasetInfo[]					// List of datasets associated with lane (may be more than one)
	readsPerSample?: ReadsPerSample			// List of reads counts per sample (loaded on demand)
}

export interface ExperimentRunLanes {
	experimentRunName : string,
	lanes: LaneInfo[]
}

export interface ExperimentRunLanesUX {		// A place to store UX state (expanded lanes)
	experimentRunName: string,
	expandedLanes: number[]					// The lane numbers of lanes which are expanded in the UX.
}

export interface ExperimentRunLanesState {
	runs: {
		[key: ExperimentRunName] : ExperimentRunLanes
	}
	ux: {
		[key: ExperimentRunName] : ExperimentRunLanesUX
	}
}







