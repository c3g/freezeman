import { Collapse, Typography } from 'antd'
import React from 'react'
import LabworkOverviewProtocolPanel from './LabworkOverviewProtocolPanel'
import { LabworkSummary } from './LabworkModels'

const { Text, Title } = Typography

interface LabworkProtocolsProps {
	summary: LabworkSummary
}

const LabworkOverviewProtocols = ({summary} : LabworkProtocolsProps) => {

	return (
		<Collapse accordion>
			{summary.protocols.map(protocol => {
				return (
					<Collapse.Panel key={protocol.protocol_id} header={protocol.protocol_name} extra={<Title level={4}>{protocol.count}</Title>}>
						<LabworkOverviewProtocolPanel protocol={protocol} />
					</Collapse.Panel>	
				)
			})}
		</Collapse>
	)
}

export default LabworkOverviewProtocols