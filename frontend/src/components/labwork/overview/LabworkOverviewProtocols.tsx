import { Collapse, Typography } from 'antd'
import React from 'react'
import { LabworkSummary } from '../../../models/labwork_summary'
import LabworkOverviewProtocolPanel from './LabworkOverviewProtocolPanel'

const { Text, Title } = Typography

interface LabworkProtocolsProps {
	summary: LabworkSummary
}

const LabworkOverviewProtocols = ({ summary }: LabworkProtocolsProps) => {
	return (
		<Collapse>
			{summary.protocols.map((protocol) => {
				return (
					<Collapse.Panel key={protocol.id} header={protocol.name} extra={<Title level={4}>{protocol.count}</Title>}>
						<LabworkOverviewProtocolPanel protocol={protocol} />
					</Collapse.Panel>
				)
			})}
		</Collapse>
	)
}

export default LabworkOverviewProtocols
