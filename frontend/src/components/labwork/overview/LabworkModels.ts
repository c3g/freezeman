import { Protocol } from "../../../models/frontend_models"
import { FMSId } from "../../../models/fms_api_models"

// TEMPORARY UNTIL END POINT IS READY AND MODEL IS DEFINED



// An object that contains all of the labwork summary information
export interface LabworkSummary {
	protocols: LabworkSummaryProtocol[]
}

// The summary is divided by protocol, so there is one 'card' per protocol.
export interface LabworkSummaryProtocol {
	protocol_id: FMSId
	protocol_name: string
	count: number					// number of samples for the entire protocol
	steps: LabworkSummaryStep[]
	groups: LabworkStepGrouping[]
}

// Steps are group by a common feature, such as platform or sample type. The grouping
// criteria would be different for each protocol type, and depends on the step specification.
// interface LabworkStepGroup {
// 	name: string					// group name (RNA / DNA / ILLUMINA / DBNSEQ / etc..)
// 	steps: LabworkSummaryStep[]		// Steps belonging to group
// }

export interface LabworkStepGrouping {
	id: number
	group_name: string
}

// A specific step (eg Extraction (RNA))
export interface LabworkSummaryStep {
	name: string
	count: number
	group?: number			// ID of the group this step belongs to
	specifications: LabworkStepSpecification[]
}

// A step specification value
export interface LabworkStepSpecification {
	display_name: string
	sheet_name: string
	column_name: string
	value: string
}


export const mock : LabworkSummary = {
	protocols: [
		{
			protocol_id: 1,
			protocol_name: 'Extraction',
			count: 123,
			steps: [
				{
					name: 'Extraction (RNA)',
					count: 123,
					specifications: [
						{
							display_name: 'Extraction Type',
							sheet_name: 'ExtractionTemplate',
							column_name: 'Extraction Type',
							value: 'RNA'
						}
					]
				},
				{
					name: 'Extraction (DNA)',
					count: 0,
					specifications: [
						{
							display_name: 'Extraction Type',
							sheet_name: 'ExtractionTemplate',
							column_name: 'Extraction Type',
							value: 'DNA'
						}
					]
				}
			],
			groups: []
		},
		{
			protocol_id: 15,
			protocol_name: 'Library Preparation',
			count: 28,
			steps: [
				{
					name: 'Library Preparation (PCR-free, Illumina)',
					count: 15,
					group: 1,
					specifications: [
						{
							display_name: 'Library Type',
							sheet_name: 'Library Batch',
							column_name: 'Library Type',
							value: 'PCR-free'
						},
						{
							display_name: 'Library Platform',
							sheet_name: 'Library Batch',
							column_name: 'Platform',
							value: 'ILLUMINA'
						}
					]
				},
				{
					name: 'Library Preparation (PCR-enriched, Illumina)',
					count: 0,
					group: 1,
					specifications: [/*etc*/]
				},
				{
					name: 'Library Preparation (RNASeq, Illumina)',
					count: 13,
					group: 1,
					specifications: [/*etc*/]
				},
				
			],
			groups: [
				{
					id: 1,
					group_name: 'ILLUMINA'
				},
				{
					id: 2,
					group_name: 'MGI'
				}
			]
		}
	]
}