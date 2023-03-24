import { FMSId } from "../../models/fms_api_models"


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