import { FMSStepSpecification } from '../../models/fms_api_models'

/*
	Labwork Summary Module
*/

export interface LabworkSummary {
	protocols: LabworkSummaryProtocol[]
}

export interface LabworkSummaryProtocol {
	id: number						// protocol id
	name: string					// protocol name
	count: number					// total count of samples waiting for protocol
	groups: LabworkStepGroup[]		// Grouped steps
}

export interface LabworkStepGroup {
	defaultGroup: boolean			// Flag to indicate that the steps are not grouped
	name?: string					// If steps are grouped then this is the group name
	steps: LabworkSummaryStep[]		// Steps
}

export interface LabworkSummaryStep {
	id: number						// Step ID
	name: string					// Step name
	count: number					// Number of samples at step
	specifications: FMSStepSpecification[]	// Step specifications
}

