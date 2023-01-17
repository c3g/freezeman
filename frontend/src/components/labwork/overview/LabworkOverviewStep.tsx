import React from 'react'
import { Link } from 'react-router-dom'
import { Card, Typography } from 'antd'
import { LabworkSummaryStep } from './LabworkModels'

interface LabworkStepProps {
	step: LabworkSummaryStep
}

const LabworkOverviewStep = ({step} : LabworkStepProps) => {
	// TODO Link to step page
	return (
		<Card size='small'>
			<div style={{width: "100%", display: "flex", justifyContent: "space-between"}}>
				<Link to={'#'}>{step.name}</Link>
				<Typography.Title level={5}>{step.count}</Typography.Title>
			</div>
		</Card>
		
	)
}

export default LabworkOverviewStep
