import { Collapse, Space, Switch, Typography } from 'antd'
import React from 'react'
import { useAppDispatch } from '../../../hooks'
import { refreshLabwork, setHideEmptyProtocols } from '../../../modules/labwork/actions'
import { LabworkSummary } from '../../../modules/labwork/models'
import RefreshButton from '../../RefreshButton'
import LabworkOverviewProtocolPanel from './LabworkOverviewProtocolPanel'

const { Title } = Typography

interface LabworkProtocolsProps {
	summary: LabworkSummary,
	hideEmptyProtocols: boolean,
	refreshing: boolean
}

const LabworkOverviewProtocols = ({ summary, hideEmptyProtocols, refreshing }: LabworkProtocolsProps) => {
	const dispatch = useAppDispatch()

	// If hideEmptyProtocols is true then we filter the protocol list to include
	// only protocols with a count greater than zero.
	let protocols = summary.protocols

	if (hideEmptyProtocols) {
		protocols = protocols.filter(protocol => protocol.count > 0)
	}

	function handleHideEmptyProtocols(hide: boolean) {
		dispatch(setHideEmptyProtocols(hide))
	}

	function handleLabworkRefresh() {
		dispatch(refreshLabwork())
	}
 
	return (
		<>
			<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
				<Title level={2}>Protocols</Title>
				<Space>
					<Switch 
						checkedChildren={'Show all'} 
						unCheckedChildren={'Hide Empty'} 
						checked={hideEmptyProtocols} 
						onChange={handleHideEmptyProtocols}
					/>
					<RefreshButton 
						refreshing={refreshing} 
						onRefresh={handleLabworkRefresh}
						title='Update with the latest state of the samples in the lab'
					/>
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
