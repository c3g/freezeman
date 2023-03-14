import { FMSId, FMSLabworkSummary, WorkflowStep } from "../../models/fms_api_models"
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
			const groups = new Map<string, LabworkStepGroup>()
			groups.set('UNKNOWN', {
				defaultGroup: false,
				name: 'UNKNOWN',
				steps: []
			})

			// Create a group for each unique platform found in step specs
			for(const step of steps) {
				let group
				const platform = getSpecifiedValue(step, 'Library Platform')
				if (platform) {
					if (!groups.has(platform)) {
						groups.set(platform, {
							defaultGroup: false,
							name: platform,
							steps: []
						})
					}
					group = groups.get(platform)
				} else {
					group = groups.get('UNKNOWN')
				}
				if (group) {
					group.steps.push(step)
				}
			}

			// Sort the groups by group name (since the order of items in the map is random)
			const sortedGroups =  [...groups.values()]
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
 * Figure out the sorting for order for all of the protocols used in the workflows.
 * We look compare each protocol to all the other protocols in the workflow to figure
 * out which ones it usually follows, and which ones it usually preceeds. * 
 * @param protocols 
 * @param workflows 
 * @returns 
 */
function getSortedProtocolsFromWorkflows(workflows: Workflow[]): FMSId[] {

	// Sorting has to scan all steps across all workflows. To avoid doing this more than once,
	// we gather information about where in each workflow a protocol is used. The map key is
	// the protocol id, and one entry is created for each step that is found using that protocol.
	// It's gnarly code! Sorry, but my first implementation had to traverse the workflows several times.
	type ProtocolEntry = {
		workflowID: FMSId
		stepOrder: number
		numSteps: number
		step: WorkflowStep
	}

	const workflowOccurences = new Map<FMSId, ProtocolEntry[]>()

	workflows.forEach(workflow => {
		workflow.steps_order.forEach(step => {
			const entry : ProtocolEntry = {
				workflowID: workflow.id,
				stepOrder: step.order,
				numSteps: workflow.steps_order.length,
				step: step
			}
			const list = workflowOccurences.get(step.protocol_id)
			if (list) {
				list.push(entry)
			} else {
				workflowOccurences.set(step.protocol_id, [entry])
			}
		})
	})

	
	function compareProtocolPositionsInWorkflows(protocolID_A: FMSId, protocolID_B: FMSId) {
		const entriesA = workflowOccurences.get(protocolID_A)
		const entriesB = workflowOccurences.get(protocolID_B)

		let numBefore = 0
		let numAfter = 0

		// Compare the position of protocol A with the position of protocol B in each
		// workflow that contains the two. Count the number of times that A appears after
		// B in the workflow, and the number of time A appears before B. Use that to decide
		// if A is normally before or after B in the sort order.
		if (entriesA && entriesB) {
			for(const entryA of entriesA) {
				// Find and occurence of B in the same workflow as A
				const entryB = entriesB.find(entry => entry.workflowID === entryA.workflowID)
				if (entryB) {
					if (entryA.stepOrder < entryB.stepOrder) {
						numBefore++
					} else {
						numAfter++
					}
				}
			}

			// If numBefore and numberAfter are both zero then there was no case where both A and B
			// are used in the same workflow, so we can't compare their positions in the workflow.
			// Instead, compute an average "distance" for A and B. This is the step order divided by
			// the number of steps in the workflow, averaged over all workflows the protocol appears in.
			// The idea is to figure out if the protocol appears near the beginning of workflows or near
			// the end. Without this, rarely used protocols tend to end up at the top of the list 
			// (eg DBNSEQ Preparation).
			if (numBefore === 0 && numAfter === 0) {
				const distanceA = entriesA.reduce((acc, entry) => {
					return acc + (entry.stepOrder / entry.numSteps)
				}, 0) / entriesA.length
				const distanceB = entriesB.reduce((acc, entry) => {
					return acc + (entry.stepOrder / entry.numSteps)
				}, 0) / entriesB.length

				return distanceA - distanceB
			} else {
				return numAfter - numBefore
			}
		}
		return 0
	}

	const protocolIDs = [...workflowOccurences.keys()]
	const sortedProtocolIDs = protocolIDs.sort(compareProtocolPositionsInWorkflows)

	return sortedProtocolIDs
}
