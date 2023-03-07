import { SyncOutlined } from '@ant-design/icons'
import { Button, Collapse, Space, Switch, Typography } from 'antd'
import React from 'react'
import { useAppDispatch } from '../../../hooks'
import { LabworkSummary } from '../../../models/labwork_summary'
import { refreshLabworkSummary, setHideEmptyProtocols } from '../../../modules/labwork/actions'
import LabworkOverviewProtocolPanel from './LabworkOverviewProtocolPanel'

const { Title } = Typography

interface LabworkProtocolsProps {
	summary: LabworkSummary,
	hideEmptyProtocols: boolean
}

const LabworkOverviewProtocols = ({ summary, hideEmptyProtocols }: LabworkProtocolsProps) => {
	const dispatch = useAppDispatch()

	// If hideEmptyProtocols is true then we filter the protocol list to include
	// only protocols with a count greater than zero.
	let protocols = summary.protocols

	// Sort protocols by name (the endpoint returns them in random order)
	protocols = protocols.sort((a, b) => a.name.localeCompare(b.name))

	if (hideEmptyProtocols) {
		protocols = protocols.filter(protocol => protocol.count > 0)
	}



	return (
		<>
			<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
				<Title level={2}>Protocols</Title>
				<Space>
					<Switch checkedChildren={'Show all'} unCheckedChildren={'Hide Empty'} checked={hideEmptyProtocols} onChange={value => dispatch(setHideEmptyProtocols(value))}/>
					<Button icon={<SyncOutlined/>} onClick={
						() => {
							dispatch(refreshLabworkSummary())
						}
					} title='Update with the latest state of the samples in the lab'>Refresh</Button>
				</Space>
			</div>
			<Collapse>
				{protocols.map((protocol) => {
					return (
						<Collapse.Panel key={protocol.id} header={protocol.name} extra={<Title level={4}>{protocol.count}</Title>}>
							<LabworkOverviewProtocolPanel protocol={protocol} hideEmptySteps={hideEmptyProtocols}/>
						</Collapse.Panel>
					)
				})}
			</Collapse>
		</>
		
	)
}

export default LabworkOverviewProtocols
