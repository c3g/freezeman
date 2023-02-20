import { Button, Checkbox, Col, Row, TableColumnType, Tabs, Typography } from 'antd'
import React, { useState } from 'react'
import { useAppDispatch } from '../../../hooks'
import { FMSId } from '../../../models/fms_api_models'
import { Protocol } from '../../../models/frontend_models'
import { LabworkSummaryStep } from '../../../models/labwork_summary'
import { LabworkStepSamples } from '../../../modules/labworkSteps/models'
import AppPageHeader from '../../AppPageHeader'
import PageContent from '../../PageContent'
import WorkflowSamplesTable from '../../shared/WorkflowSamplesTable/WorkflowSamplesTable'
import { selectStepSamples, deselectStepSamples } from '../../../modules/labworkSteps/actions'

const { Title, Text } = Typography

interface LabworkStepPageProps {
	protocol: Protocol
	step: LabworkSummaryStep
	stepSamples: LabworkStepSamples
	loading: boolean
}

const LabworkStep = ({ protocol, step, stepSamples, loading }: LabworkStepPageProps) => {

	const dispatch = useAppDispatch()

	function createSelectionColumn() {
		// Add a special "Selected" column  
		const selectionColumn : TableColumnType<any> = {
			title: 'Selected',
			render: (value, item) => {
				const sampleID = item.sample.id
				const selected = stepSamples.selectedSamples.includes(sampleID)
				return (
					<Checkbox checked={selected} onChange={event => {
						const checked = event.target.checked
						if (checked) {
							dispatch(selectStepSamples(step.id, [sampleID]))
						} else {
							dispatch(deselectStepSamples(step.id, [sampleID]))
						}
					}}/>
				)
			}
		}
		return selectionColumn
	}

	const samplesCheckboxColumn = createSelectionColumn()
	const selectionCheckboxColumn = createSelectionColumn()

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
						<WorkflowSamplesTable stepName={step.name} protocol={protocol} sampleIDs={stepSamples.displayedSamples} prefixColumn={samplesCheckboxColumn}/>
					</Tabs.TabPane>
					<Tabs.TabPane tab='Selection' key='selection'>
						<WorkflowSamplesTable stepName={step.name} protocol={protocol} sampleIDs={stepSamples.selectedSamples} prefixColumn={selectionCheckboxColumn}/>
					</Tabs.TabPane>
				</Tabs>
				<Button type='primary'>Prefill Template</Button>
			</PageContent>
		</>
	)
}

export default LabworkStep