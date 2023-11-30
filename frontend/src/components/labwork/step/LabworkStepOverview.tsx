import { Collapse, Space, Switch, Typography } from 'antd'
import React from 'react'
import { useAppDispatch } from '../../../hooks'
import { refreshLabwork, setHideEmptySections } from '../../../modules/labwork/actions'
import { LabworkSummary } from '../../../modules/labwork/models'
import RefreshButton from '../../RefreshButton'
import LabworkStepOverviewPanel from './LabworkStepOverviewPanel'

const { Title } = Typography

interface LabworkStepGroup {
	name: string,
	count: number,
  sample_ids: number[]
}

const LabworkStepOverview = (step) => {
	const dispatch = useAppDispatch()
  const groups: LabworkStepGroup[] = []
  
	return (
		<>
			<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
				<Title level={2}>Groups</Title>
			</div>
			<Collapse>
				{groups.map((group) => {
					return (
						<Collapse.Panel key={group.name} header={group.name} extra={<Title level={4}>{group.count}</Title>}>
							<LabworkStepOverviewPanel/>
						</Collapse.Panel>
					)
				})}
			</Collapse>
		</>
	)
}

export default LabworkStepOverview
