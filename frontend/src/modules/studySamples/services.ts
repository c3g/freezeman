import { FMSSampleNextStepByStudy, FMSId, FMSStepHistory } from "../../models/fms_api_models"
import { Study, Workflow } from "../../models/frontend_models"
import { StudySampleList, StudySampleStep } from "./models"


export function buildStudySamplesFromWorkflow(
	study: Study, 
	workflow: Workflow, 
	sampleNextStepsByStudy: FMSSampleNextStepByStudy[],
	completedSamplesByStudy: FMSStepHistory[]) : StudySampleList {
	const sampleList : FMSId[] = []
	const stepMap = new Map<FMSId, StudySampleStep>()

	// Create the list of study steps from the workflow, starting and ending at the steps defined in the study.
	workflow.steps_order.forEach(stepOrder => {
		if (stepOrder.order >= study.start && stepOrder.order <= study.end) {
			const step : StudySampleStep = {
				stepID: stepOrder.step_id,
				stepName: stepOrder.step_name,
        		stepOrderID: stepOrder.id,
				stepOrder: stepOrder.order,
				protocolID: stepOrder.protocol_id,
				samples: [],
				completedSamples: []
			}
			stepMap.set(step.stepOrderID, step)
		}
	}) 

	// Insert the sample ID's into the steps
	sampleNextStepsByStudy.forEach(sampleNextStepByStudy => {
		// Add the sample ID to the study samples step.
		// If the step doesn't exist in the workflow then ignore the sample next step.
		const step = stepMap.get(sampleNextStepByStudy.step_order)
		if (step) {
			step.samples.push(sampleNextStepByStudy.sample)
			sampleList.push(sampleNextStepByStudy.sample)
		} else {
			console.warn(`A study sample was ignored (ID: ${sampleNextStepByStudy.sample}). It is at step order (ID: ${sampleNextStepByStudy.step_order}) which is not in the study's ${workflow.name} workflow.`)
		}
	})

	completedSamplesByStudy.forEach(completedSample => {
		const step = stepMap.get(completedSample.step_order)
		if (step) {
			step.completedSamples.push(completedSample.sample)
			sampleList.push(completedSample.sample)
		}
	})

	// Return the steps in the step order
	const steps = Array.from(stepMap.values()).sort((a, b) => a.stepOrder - b.stepOrder)

	return {
		sampleList,
		steps
	}
}