import { FMSId } from "../../models/fms_api_models"
import { ExperimentRun } from "../../models/frontend_models"
import { PagedItems } from "../../models/paged_items"


type ExperimentRunName = string
export type LaneNumber = number

export enum ValidationStatus {
	AVAILABLE = 'AVAILABLE',
	PASSED = 'PASSED',
	FAILED = 'FAILED',
}

export interface DatasetInfo {
	datasetID: FMSId						// The ID of the dataset in the db
	metricsURL?: string						// A link to the run metrics associated with this lane
}

export interface SampleReads {
	sampleID: FMSId
	sampleName: string
	nbReads : number
}

export interface ReadsPerSample {
	// TODO : Is there some kind of sort order for the samples that would be
	// helpful to the lab? 
	sampleReads: SampleReads[]
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

export interface ExperimentRunLanesState {
	runs: {
		[key: ExperimentRunName] : ExperimentRunLanes
	}
}

/*
	const laneData = {
		experimentRunID: FMSId
        run_name: 'MY BIG RUN',
        laneNumber: 1,
		validationStatus: 'PASSED',
		datasets: [
			{
				datasetID: 1234,
				metrics_url: 'https://whatever',
			}
		],
        readsPerSample: [
			{
				sample_id: 187663,
				sample_name: 'VCR1976',
				nb_reads: 2000000                     
			}
		],
    }
*/






