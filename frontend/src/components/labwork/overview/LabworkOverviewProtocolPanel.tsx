import React from 'react'
import { LabworkSummaryProtocol } from '../../../models/labwork_summary'
import LabworkOverviewStepGroup from './LabworkOverviewStepGroup'

export interface LabworkProtocolPanelProps {
	readonly protocol: LabworkSummaryProtocol
	readonly hideEmptySteps: boolean
}

const LabworkOverviewProtocolPanel = ({ protocol, hideEmptySteps }: LabworkProtocolPanelProps) => {
	return (
		<>
			{protocol.groups.map((group) => (
				<LabworkOverviewStepGroup key={`${protocol.name}-${group.name ?? 'default'}`} group={group} hideEmptySteps={hideEmptySteps}/>
			))}
		</>
	)
}

export default LabworkOverviewProtocolPanel
