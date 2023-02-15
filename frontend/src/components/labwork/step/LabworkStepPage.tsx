import React from 'react'
import { FMSId, WorkflowStep } from '../../../models/fms_api_models'
import { Protocol, Sample } from '../../../models/frontend_models'
import { selectSamplesByID } from '../../../selectors'
import store from '../../../store'
import { networkAction } from '../../../utils/actions'
import { list } from '../../../modules/samples/actions'


// The page that lists the samples ready for processing by a given
// protocol and allows the user to select the samples and generate
// a prefilled template.

// interface LabworkStepSamples {
// 	// TODO Define a single interface for steps
// 	stepID: FMSId
// 	protocolID: FMSId
// 	templateID: number
// 	samples: FMSId[]
// }

interface LabworkStep {
	id: FMSId
	name: string
	protocolID: FMSId
	specifications: []
}

interface TemplateDefinition {
	name: string
	id: number
}

interface LabworkStepSamples {
	step: LabworkStep
	protocol: Protocol
	template: TemplateDefinition
	samples: Sample[]
}

// Write a new function to fetch samples from the store or the backend?
// Is it time to implement a sample cache?
async function fetchSamples(ids: number[]) : Promise<Sample[]> {
	const samples : Sample[] = []
	const samplesToFetch : number[] = []

	// Get the samples that are already in the store
	const samplesByID = selectSamplesByID(store.getState())
	ids.forEach(id => {
		const sample = samplesByID[id]
		if (sample) {
			samples.push(sample)
		} else {
			samplesToFetch.push(id)
		}
	})

	// Fetch the samples that are not already in the store
	// TODO : fetch all samples? What if they need to be paged?
	// const result = list()

	return samples

}


interface LabworkProtocolPageProps {
	
}

const LabworkProtocolPage = ({}: LabworkProtocolPageProps) => {
	
}