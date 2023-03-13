import { Typography } from 'antd'
import React from 'react'
import { Link } from 'react-router-dom'
import { LabworkSummaryStep } from '../../../models/labwork_summary'

interface LabworkStepProps {
	step: LabworkSummaryStep
}

const LabworkOverviewStep = ({ step }: LabworkStepProps) => {
	// TODO Link will point to protocol page once that is implemented
	return (
		<div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
			<Link to={`step/${step.id}`}>{step.name}</Link>
			<Typography.Title level={5}>{step.count}</Typography.Title>
		</div>
	)
}

export default LabworkOverviewStep
