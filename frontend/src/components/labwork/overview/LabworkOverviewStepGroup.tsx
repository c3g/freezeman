import { List, Typography } from 'antd'
import React from 'react'
import { LabworkStepGroup } from '../../../models/labwork_summary'
import LabworkOverviewStep from './LabworkOverviewStep'

const { Title } = Typography

interface LabworkOverviewStepGroupProps {
	group: LabworkStepGroup
}

const LabworkOverviewStepGroup = ({ group }: LabworkOverviewStepGroupProps) => {
	const renderNamedGroup = group.defaultGroup === false && group.steps.length > 1 && !!group.name
	const listData = group.steps

	return (
		<div style={{ padding: '1rem' }}>
			{renderNamedGroup && <Title level={4}>{group.name}</Title>}
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
