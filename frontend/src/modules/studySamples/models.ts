import { FMSId } from "../../models/fms_api_models"


export interface StudySampleList {
	sampleList: FMSId[]
	steps: StudySampleStep[]
}

export interface StudySampleStep {
	stepID:	FMSId					// step ID
	stepName: string				// step name
  	stepOrderID: FMSId      // step order ID
	stepOrder: number				// step order
	protocolID: FMSId				// protocol ID
	samples: FMSId[]				// List of samples at step
	completedSamples: FMSId[]		// Samples that have completed this step
}