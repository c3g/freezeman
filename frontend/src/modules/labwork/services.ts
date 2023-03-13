import { FMSId, FMSLabworkSummary } from "../../models/fms_api_models"
import { LabworkStepGroup, LabworkSummary, LabworkSummaryProtocol, LabworkSummaryStep } from "../../models/labwork_summary"

/**
 * Processes the labwork summary data received from the backend, adding step grouping.
 * @param fmsSummary FMSLabworkSummary
 * @returns LabworkSummary
 */
export function processFMSLabworkSummary(fmsSummary: FMSLabworkSummary): LabworkSummary {
	
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

		// TODO : sort the protocols? By which criteria? Ideally it would match the basic
		// order of steps in the workflows somehow.
	}

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