import { FMSLabworkProtocol, FMSLabworkStep, FMSLabworkStepSpecification, FMSLabworkSummary } from './fms_api_models'

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
	name: string
	count: number
	specifications: LabworkSummaryStepSpecification[]
}

export interface LabworkSummaryStepSpecification extends FMSLabworkStepSpecification {}

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

			for (const group of groups.values()) {
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

	return result
}

function getSpecifiedValue(step: LabworkSummaryStep, displayName: string) {
	const spec = step.specifications.find(spec => spec.display_name === displayName)
	if (spec) {
		return spec.value
	}
	return undefined
}

function hasSpecification(step: LabworkSummaryStep, displayName: string) {
	return step.specifications.some(spec => spec.display_name === displayName)
}

function hasSpecifiedValue(step: LabworkSummaryStep, displayName: string, value: string) {
	return step.specifications.some(spec => spec.display_name === displayName && spec.value === value)
}

function addGroupIfNotEmpty(protocol: LabworkSummaryProtocol, group: LabworkStepGroup) {
	if (group.steps.length > 0) {
		protocol.groups.push(group)
	}
}