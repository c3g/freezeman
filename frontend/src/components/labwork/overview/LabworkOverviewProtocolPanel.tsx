import React from 'react'
import { LabworkSummaryProtocol } from '../../../models/labwork_summary'
import LabworkOverviewStepGroup from './LabworkOverviewStepGroup'

export interface LabworkProtocolPanelProps {
	readonly protocol: LabworkSummaryProtocol
}

const LabworkOverviewProtocolPanel = ({ protocol }: LabworkProtocolPanelProps) => {
	return (
		<>
			{protocol.groups.map((group) => (
				<LabworkOverviewStepGroup key={`${protocol.name}-${group.name ?? 'default'}`} group={group} />
			))}
		</>
	)
}

export default LabworkOverviewProtocolPanel