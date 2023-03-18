import { List, Typography } from 'antd'
import React from 'react'
import { LabworkStepGroup } from '../../../models/labwork_summary'
import LabworkOverviewStep from './LabworkOverviewStep'

const { Title } = Typography

interface LabworkOverviewStepGroupProps {
	group: LabworkStepGroup
	hideEmptySteps: boolean
}

const LabworkOverviewStepGroup = ({ group, hideEmptySteps }: LabworkOverviewStepGroupProps) => {
	const renderNamedGroup = group.defaultGroup === false && !!group.name
	let listData = group.steps
	if (hideEmptySteps) {
		listData = listData.filter(step => step.count > 0)
	}

	return (
		<div style={{ padding: '1rem' }}>
			{renderNamedGroup && <Title level={5}>{group.name}</Title>}
			<List
				size="small"
				dataSource={listData}
				style={{ marginRight: '0.5rem' }}
				renderItem={(item) => (
					<List.Item>
						<LabworkOverviewStep step={item} />
					</List.Item>
				)}
			/>
		</div>
	)
}

export default LabworkOverviewStepGroup
