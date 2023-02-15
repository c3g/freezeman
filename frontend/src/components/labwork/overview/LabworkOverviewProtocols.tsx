import { Collapse, Switch, Typography } from 'antd'
import React from 'react'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { LabworkSummary } from '../../../models/labwork_summary'
import LabworkOverviewProtocolPanel from './LabworkOverviewProtocolPanel'
import { setHideEmptyProtocols } from '../../../modules/labwork/actions'

const { Text, Title } = Typography

interface LabworkProtocolsProps {
	summary: LabworkSummary,
	hideEmptyProtocols: boolean
}

const LabworkOverviewProtocols = ({ summary, hideEmptyProtocols }: LabworkProtocolsProps) => {
	const dispatch = useAppDispatch()

	// If hideEmptyProtocols is true then we filter the protocol list to include
	// only protocols with a count greater than zero.
	let protocols = summary.protocols
	if (hideEmptyProtocols) {
		protocols = protocols.filter(protocol => protocol.count > 0)
	}
	return (
		<>
			<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
				<Title level={2}>Protocols</Title>
				<Switch checkedChildren={'Show all'} unCheckedChildren={'Hide Empty'} checked={hideEmptyProtocols} onChange={value => dispatch(setHideEmptyProtocols(value))}/>
			</div>
			<Collapse>
				{protocols.map((protocol) => {
					return (
						<Collapse.Panel key={protocol.id} header={protocol.name} extra={<Title level={4}>{protocol.count}</Title>}>
							<LabworkOverviewProtocolPanel protocol={protocol} />
						</Collapse.Panel>
					)
				})}
			</Collapse>
		</>
		
	)
}

export default LabworkOverviewProtocols
