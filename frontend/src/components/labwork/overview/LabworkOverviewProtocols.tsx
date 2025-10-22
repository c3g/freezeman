import { Collapse, Space, Switch, Typography } from 'antd'
import React, { useMemo } from 'react'
import { useAppDispatch } from '../../../hooks'
import { refreshLabwork, setHideEmptySections } from '../../../modules/labwork/actions'
import { LabworkSummary } from '../../../modules/labwork/models'
import RefreshButton from '../../RefreshButton'
import LabworkOverviewProtocolPanel from './LabworkOverviewProtocolPanel'
import protocolSortOrder from '../../../modules/labwork/protocolSortOrder.json'

const { Title } = Typography

interface LabworkProtocolsProps {
	summary: LabworkSummary,
	hideEmptySections: boolean,
	refreshing: boolean
}

const LabworkOverviewProtocols = ({ summary, hideEmptySections, refreshing }: LabworkProtocolsProps) => {
	const dispatch = useAppDispatch()

	// If hideEmptySections is true then we filter the protocol list to include
	// only protocols with a count greater than zero.
	const protocols = useMemo(() => {
		let protocols = summary.protocols

		if (hideEmptySections) {
			protocols = protocols.filter(protocol => protocol.count > 0)
		}

		return protocols
	}, [hideEmptySections, summary.protocols])

	const sortedProtocols = useMemo(() => {
		const sortOrder = protocolSortOrder.reduce((acc, protocolName, index) => {
			acc[protocolName] = index
			return acc
		}, {} as Record<string, number>)

		return protocols.slice().sort((a, b) => {
			const aIndex = sortOrder[a.name] !== undefined ? sortOrder[a.name] : Number.MAX_SAFE_INTEGER
			const bIndex = sortOrder[b.name] !== undefined ? sortOrder[b.name] : Number.MAX_SAFE_INTEGER
			return aIndex - bIndex
		})
	}, [protocols])

	function handleHideEmptySections(hide: boolean) {
		dispatch(setHideEmptySections(hide))
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
						checked={hideEmptySections} 
						onChange={handleHideEmptySections}
					/>
					<RefreshButton 
						refreshing={refreshing} 
						onRefresh={handleLabworkRefresh}
						title='Update with the latest state of the samples in the lab'
					/>
				</Space>
			</div>
			<Collapse items={sortedProtocols.map((protocol) => {
				return {
					key: protocol.id,
					label: protocol.name,
					extra: <Title level={4}>{protocol.count}</Title>,
					children: <LabworkOverviewProtocolPanel protocol={protocol} hideEmptySteps={hideEmptySections}/>
				}
			})} />
		</>
	)
}

export default LabworkOverviewProtocols
