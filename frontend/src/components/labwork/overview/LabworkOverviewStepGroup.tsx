import { Listy, Typography } from 'antd'
import React from 'react'
import { LabworkStepGroup } from '../../../modules/labwork/models'
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
			<Listy
				items={listData}
				rowKey="id"
				style={{ marginRight: '0.5rem' }}
				styles={{
					item: {
					padding: '8px 0',
					},
				}}
				itemRender={(item) => (
					<LabworkOverviewStep step={item} />
				)}
            />
		</div>
	)
}

export default LabworkOverviewStepGroup
