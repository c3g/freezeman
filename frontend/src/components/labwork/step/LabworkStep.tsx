import { Button, Col, Row, Typography } from 'antd'
import React from 'react'
import { LabworkSummaryProtocol, LabworkSummaryStep } from '../../../models/labwork_summary'
import AppPageHeader from '../../AppPageHeader'
import PageContent from '../../PageContent'

const { Title, Text } = Typography

interface LabworkStepPageProps {
	protocol: LabworkSummaryProtocol
	step: LabworkSummaryStep
}

const LabworkStep = ({ protocol, step }: LabworkStepPageProps) => {
	return (
		<>
			<AppPageHeader title={protocol.name}>
				<Row>
					<Col span={6}>
						<Title level={5}>{`(${step.name})`}</Title>
					</Col>
					<Col span={12}></Col>
					<Col span={6}>
						<Button >Submit Template</Button>
					</Col>
				</Row>
			</AppPageHeader>
			<PageContent loading={false} style={{ maxWidth: '50rem' } as any}>
				
			</PageContent>
		</>
	)
}

export default LabworkStep