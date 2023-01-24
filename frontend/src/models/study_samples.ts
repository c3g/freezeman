import { FetchedState } from "../modules/common"
import { FMSId, FMSSampleNextStep } from "./fms_api_models"
import { selectProtocolsByID } from "../selectors"

export interface StudySampleList {
	sampleList: FMSId[]
	steps: StudySampleStep[]
}

export interface StudySampleStep {
	stepID:	FMSId					// step ID
	stepName: string				// step name
	stepOrder: number				// step order
	protocolID: FMSId				// protocol ID
	samples: FMSId[]				// List of samples at step
}


export function buildStudySamples(sampleNextSteps: FMSSampleNextStep[]): StudySampleList {
	const sampleList : FMSId[] = []
	const stepMap = new Map<FMSId, StudySampleStep>()

	// Group samples by step and return a list of steps that each contain a list of samples
	sampleNextSteps.forEach(sampleNextStep => {
		let studySampleStep = stepMap.get(sampleNextStep.step.id)
		if (!studySampleStep) {
			studySampleStep = {
				stepID: sampleNextStep.step.id,
				stepName: sampleNextStep.step.name,
				stepOrder: sampleNextStep.step_order_number,
				protocolID: sampleNextStep.step.protocol_id,
				samples: []
			}
			stepMap.set(sampleNextStep.step.id, studySampleStep)
		}
		studySampleStep.samples.push(sampleNextStep.sample)
		sampleList.push(sampleNextStep.sample)
	})

	// Return the steps in the step order
	const steps = Array.from(stepMap.values()).sort((a, b) => a.stepOrder - b.stepOrder)

	return {
		sampleList,
		steps
	}

}

