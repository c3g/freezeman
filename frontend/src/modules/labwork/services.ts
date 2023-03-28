import { FMSId, FMSLabworkSummary } from "../../models/fms_api_models"
import { Workflow } from "../../models/frontend_models"
import { LabworkStepGroup, LabworkSummary, LabworkSummaryProtocol, LabworkSummaryStep } from "../../models/labwork_summary"


let sortedProtocols: FMSId[] = []

/**
 * Processes the labwork summary data received from the backend, adding step grouping.
 * @param fmsSummary FMSLabworkSummary
 * @returns LabworkSummary
 */
export function processFMSLabworkSummary(
	fmsSummary: FMSLabworkSummary,
	workflows: Workflow[]): LabworkSummary {
	
	const result: LabworkSummary = {
		protocols: []
	}

	for (const protocolID in fmsSummary.protocols) {
		const fmsProtocol = fmsSummary.protocols[protocolID]
		
		const protocol : LabworkSummaryProtocol = {
			id: Number.parseInt(protocolID),
			name: fmsProtocol.name,
			count: fmsProtocol.count,
			groups: []
		}

		const steps = fmsProtocol.steps.map(fmsStep => {
			const step: LabworkSummaryStep = {
				id: fmsStep.id,
				name: fmsStep.name,
				count: fmsStep.count,
				specifications: [...fmsStep.step_specifications]
			}
			return step
		})

		// Hard-coded grouping
		if (protocol.name === 'Library Preparation') {

			// Create a group for each platform
			const groupsMap = new Map<string, LabworkStepGroup>()
			groupsMap.set('UNKNOWN', {
				defaultGroup: false,
				name: 'UNKNOWN',
				steps: []
			})

			// Create a group for each unique platform found in step specs
			for(const step of steps) {
				let group
				const platform = getSpecifiedValue(step, 'Library Platform')
				if (platform) {
					if (!groupsMap.has(platform)) {
						groupsMap.set(platform, {
							defaultGroup: false,
							name: platform,
							steps: []
						})
					}
					group = groupsMap.get(platform)
				} else {
					group = groupsMap.get('UNKNOWN')
				}
				if (group) {
					group.steps.push(step)
				}
			}

			// Sort the groups by group name (since the order of items in the map is random)
			const sortedGroups =  [...groupsMap.values()]
				.sort((groupA, groupB) => {
					if (!groupA.name || !groupB.name) {
						return 0
					}
					return groupA.name.localeCompare(groupB.name)
				})

			for (const group of sortedGroups) {
				addGroupIfNotEmpty(protocol, group)
			}
		} else {
			const defaultGroup : LabworkStepGroup = {
				defaultGroup: true,
				steps
			}
			addGroupIfNotEmpty(protocol, defaultGroup)
		}		

		result.protocols.push(protocol)
	}

	// If we haven't built the sorted protocol list yet, then build it. It's
	// expensive so it should only be done once.
	if (sortedProtocols.length === 0) {
		// sortedProtocols = getSortedProtocolsFromWorkflows(workflows)
		sortedProtocols = getSortedProtocolsFromWorkflows(workflows)
	}
	result.protocols = result.protocols.sort((a, b) => {
		// Get the position of the protocols in the sorted protocol array and
		// use that to compare a and b.
		const indexA = sortedProtocols.findIndex(protocolID => protocolID === a.id)
		const indexB = sortedProtocols.findIndex(protocolID => protocolID === b.id)
		if (indexA === -1 || indexB === -1) {
			return 0
		}
		return indexA - indexB
	})

	return result
}

function getSpecifiedValue(step: LabworkSummaryStep, displayName: string) {
	const spec = step.specifications.find(spec => spec.display_name === displayName)
	if (spec) {
		return spec.value
	}
	return undefined
}

function addGroupIfNotEmpty(protocol: LabworkSummaryProtocol, group: LabworkStepGroup) {
	if (group.steps.length > 0) {
		protocol.groups.push(group)
	}
}

export function findStepInSummary(summary: LabworkSummary, stepID: FMSId) {
	for (const protocol of summary.protocols) {
		for (const group of protocol.groups) {
			const foundStep = group.steps.find(step => step.id === stepID)
			if (foundStep) {
				return {
					protocol,
					group,
					step: foundStep
				}
			}
		}
	}
	return undefined
}

/**
 * Compare a new labwork summary with an old summary, looking for any steps where the step's
 * sample count has changed.
 * 
 * Returns a list of step ID's for those steps whose counts have changed.
 * @param oldSummary 
 * @param newSummary 
 * @returns 
 */
export function findChangedStepsInSummary(oldSummary: LabworkSummary, newSummary: LabworkSummary) {

	// If there are any protocols in the new summary that were not in the old summary then
	// consider them changed as well.
	const changedStepIDs : FMSId[] = []

	for(const protocol of newSummary.protocols) {
		for (const group of protocol.groups) {
			for(const step of group.steps) {
				const found = findStepInSummary(oldSummary, step.id)
				if (found) {
					const oldStep = found.step
					if (oldStep.count !== step.count) {
						// Step count has changed - add it to the list of changed steps
						changedStepIDs.push(step.id)
					}
				}
			}
		}
	}

	return changedStepIDs
}

/**
 * Compute the sorting order for the protocols in the labwork view based on
 * the order in which they normally appear in workflows.
 * 
 * Algorithm:
 * 
 * All workflows end with an experiment (sequencing) step. Protocols are sorted
 * based on how far from the end of each workflow they are used. For example, Extraction is
 * usually the furthest from the end (since it is normally the first step in a worklow
 * if it used), followed by Sample QC then Library Preparation.
 * 
 * The function goes through every workflow and every step in each workflow. For each
 * step's protocol, it computes the distance from the end of the workflow that the step
 * appears, expressed as a percentage of the workflow length. The distances for each
 * protocol are averaged over the number of occurences of the protocol across all workflows.
 * 
 * Protocols closer to the end of the workflow are weighted more heavily than protocols
 * near the beginning. Some protocols are used multiple times in the same workflow, and
 * can appear at several positions (especially Normalization). Giving more weight to
 * the protocol when it appears near the end of the workflow produces a more 'natural'
 * result.
 * 
 * @param workflows 
 * @returns FMSId[]  Sorted list of protocols
 */
function getSortedProtocolsFromWorkflows(workflows: Workflow[]): FMSId[] {

	type StepOccurence = {
		protocolID: FMSId,
		distanceFromEnd: number,
		numOccurences: number,
		averageDistanceFromEnd: number
	}

	const stepMap = new Map<FMSId, StepOccurence>()

	// Step positions are aligned with the end of the longest workflow. If the longest length
	// is 15 then the sequencing steps all have 15 as their position.
	const longestWorkflowNumberOfSteps = workflows.reduce((acc, wf) => Math.max(acc, wf.steps_order.length), 0)

	workflows.forEach(workflow => {
		const numSteps = workflow.steps_order.length
		workflow.steps_order.forEach(step => {
			let occurence = stepMap.get(step.protocol_id)
			if (!occurence) {
				occurence = {
					protocolID: step.protocol_id,
					distanceFromEnd: 0,
					numOccurences: 0,
					averageDistanceFromEnd: 0
				}
				stepMap.set(step.protocol_id, occurence)
			}
			
			// Align the end of this workflow with the end of the longest workflow.
			// Compute the position of the step relative to the longest workflow.
			const workflowOffset = longestWorkflowNumberOfSteps - numSteps
			const position = step.order + workflowOffset// longestWorkflowNumberOfSteps - (numSteps - step.order)

			// Express the distance as a percentage of the workflow length. Cube the distance to
			// put more weight on protocols that appear near the end of the workflow. This pushes
			// Normalization to the bottom of the list, even though it is used early in workflows
			// for samples, and late in workflows for libraries.
			const EXPONENT = 3
			occurence.distanceFromEnd += Math.pow(position, EXPONENT) / longestWorkflowNumberOfSteps

			// Keep track of how many occurences of the protocol there are to compute an
			// average distance.
			occurence.numOccurences++
		})
	})

	// Compute the average distances
	for (const occurence of stepMap.values()) {
		occurence.averageDistanceFromEnd = occurence.distanceFromEnd / occurence.numOccurences
	}

	// Sort by average distance, with the higher distances sorted to the top of the list (Extraction).
	const sortedOccurences = [...stepMap.values()].sort((a, b) => {
		if (a.averageDistanceFromEnd > b.averageDistanceFromEnd) {
			return +1
		} else if (a.averageDistanceFromEnd < b.averageDistanceFromEnd) {
			return -1
		}
		return 0
	})

	// Finally, output an array of protocol ID's in the sorted order.
	const sortedProtocolIDs = sortedOccurences.map(occ => occ.protocolID)
	return sortedProtocolIDs
}
