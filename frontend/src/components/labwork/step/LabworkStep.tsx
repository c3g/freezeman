import { Button, Col, Row, Tabs, Typography } from 'antd'
import React from 'react'
import { Protocol } from '../../../models/frontend_models'
import { LabworkSummaryStep } from '../../../models/labwork_summary'
import { LabworkStepSamples } from '../../../modules/labworkSteps/models'
import AppPageHeader from '../../AppPageHeader'
import PageContent from '../../PageContent'
import WorkflowSamplesTable from '../../shared/WorkflowSamplesTable/WorkflowSamplesTable'

const { Title, Text } = Typography

interface LabworkStepPageProps {
	protocol: Protocol
	step: LabworkSummaryStep
	stepSamples: LabworkStepSamples
	loading: boolean
}

const LabworkStep = ({ protocol, step, stepSamples, loading }: LabworkStepPageProps) => {
	return (
		<>
			<AppPageHeader title={protocol.name}>
				<Row>
					<Col span={6}>
						<Title level={5}>{`(${step.name})`}</Title>
					</Col>
					<Col span={12}></Col>
					<Col span={6} >
						<Button type='primary'>Submit Template</Button>
					</Col>
				</Row>
			</AppPageHeader>
			<PageContent loading={stepSamples.pagedItems.isFetching} >
				<Tabs defaultActiveKey='samples'>
					<Tabs.TabPane tab='Samples' key='samples'>
						<WorkflowSamplesTable stepName={step.name} protocol={protocol} sampleIDs={stepSamples.displayedSamples}/>
					</Tabs.TabPane>
					<Tabs.TabPane tab='Selection' key='selection'>
						<WorkflowSamplesTable stepName={step.name} protocol={protocol} sampleIDs={stepSamples.selectedSamples}/>
					</Tabs.TabPane>
				</Tabs>
				<Button type='primary'>Prefill Template</Button>
			</PageContent>
		</>
	)
}

export default LabworkStep