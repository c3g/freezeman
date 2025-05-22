import { FMSId } from "../../models/fms_api_models"

export type LaneNumber = number

export enum ValidationStatus {
  AVAILABLE = 0,
  PASSED = 1,
  FAILED = 2,
}

export interface DatasetInfo {
  datasetID: FMSId            // The ID of the dataset in the db
  metricsURL?: string         // A link to the run metrics associated with this lane
  latestValidationTime?: string // The latest time at which a dataset of the lane was validated
}

export interface NumberOfReads {
  derivedSampleID?: FMSId         // Sample ID if this is from a freezeman experiment run and the sample is in the DB
  readsetID: FMSId                // the readset to which are attached those reads
  sampleName: string              // Name of the sample
  nbReads : number                // Number of reads for the sample
}

export interface ReadsPerSample {
  sampleReads: NumberOfReads[]
}

export interface LaneInfo {
  experimentRunId: FMSId                // Id of the run 
  laneNumber: LaneNumber                // The number of the lane
  validationStatus: ValidationStatus    // The validation status for the lane
  validationTime?: string               // The time at which the lane was last validated
  datasets: DatasetInfo[]               // List of datasets associated with lane (may be more than one)
  readsPerSample?: ReadsPerSample       // List of reads counts per sample (loaded on demand)
}

export interface ExperimentRunLanes {
  experimentRunId : FMSId,
  lanes: LaneInfo[]
}

export interface ExperimentRunLanesUX {   // A place to store UX state (expanded lanes)
  experimentRunId: FMSId,
  expandedLanes: LaneNumber[]             // The lane numbers of lanes which are expanded in the UX.
}

export interface ExperimentRunLanesState {
  runs: {
    [key: FMSId] : ExperimentRunLanes
  }
  ux: {
    [key: FMSId] : ExperimentRunLanesUX
  }
}







