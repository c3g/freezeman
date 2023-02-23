import React from 'react'
import { LabworkStepGroup, LabworkSummaryProtocol } from '../../../models/labwork_summary'
import LabworkOverviewStepGroup from './LabworkOverviewStepGroup'

export interface LabworkProtocolPanelProps {
	readonly protocol: LabworkSummaryProtocol
	readonly hideEmptySteps: boolean
}

function doesGroupHaveSamples(group: LabworkStepGroup) {
	// count the number of samples across the group's steps
	const numSamples = group.steps.reduce((acc, step) => {
		acc += step.count
		return acc
	}, 0)
	return numSamples > 0
}

const LabworkOverviewProtocolPanel = ({ protocol, hideEmptySteps }: LabworkProtocolPanelProps) => {

	let groups = [...protocol.groups]
	if (hideEmptySteps) {
		groups = groups.filter(doesGroupHaveSamples)
	}
	return (
		<>
			{groups.map((group) => (
				<LabworkOverviewStepGroup key={`${protocol.name}-${group.name ?? 'default'}`} group={group} hideEmptySteps={hideEmptySteps}/>
			))}
		</>
	)
}

export default LabworkOverviewProtocolPanel
