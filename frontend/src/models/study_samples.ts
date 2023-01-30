import { FMSId, FMSSampleNextStep } from "./fms_api_models"
import { Study, Workflow } from "./frontend_models"

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

export function buildStudySamplesFromWorkflow(study: Study, workflow: Workflow, sampleNextSteps: FMSSampleNextStep[]) : StudySampleList {
	const sampleList : FMSId[] = []
	const stepMap = new Map<FMSId, StudySampleStep>()

	// Create the list of study steps from the workflow, starting and ending at the steps defined in the study.
	workflow.steps_order.forEach(stepOrder => {
		if (stepOrder.order >= study.start && stepOrder.order <= study.end) {
			const step : StudySampleStep = {
				stepID: stepOrder.step_id,
				stepName: stepOrder.step_name,
				stepOrder: stepOrder.order,
				protocolID: stepOrder.protocol_id,
				samples: []
			}
			stepMap.set(step.stepID, step)
		}
	}) 

	// Insert the sample ID's into the steps
	sampleNextSteps.forEach(sampleNextStep => {
		// Add the sample ID to the study samples step.
		// If the step doesn't exist in the workflow then ignore the sample next step.
		const step = stepMap.get(sampleNextStep.step.id)
		if (step) {
			step.samples.push(sampleNextStep.sample)
			sampleList.push(sampleNextStep.sample)
		} else {
			console.warn(`A study sample was ignored (ID: ${sampleNextStep.sample}). It is at step "${sampleNextStep.step.name}" which is not a step in the study's ${workflow.name} workflow.`)
		}
	})

	// Return the steps in the step order
	const steps = Array.from(stepMap.values()).sort((a, b) => a.stepOrder - b.stepOrder)

	return {
		sampleList,
		steps
	}
}


