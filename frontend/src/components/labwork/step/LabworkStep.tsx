import { Button, Checkbox, Col, Row, TableColumnType, Tabs, Typography } from 'antd'
import React, { useMemo, useState } from 'react'
import { useAppDispatch } from '../../../hooks'
import { FMSId } from '../../../models/fms_api_models'
import { Protocol } from '../../../models/frontend_models'
import { LabworkSummaryStep } from '../../../models/labwork_summary'
import { LabworkStepSamples } from '../../../modules/labworkSteps/models'
import AppPageHeader from '../../AppPageHeader'
import PageContent from '../../PageContent'
import WorkflowSamplesTable from '../../shared/WorkflowSamplesTable/WorkflowSamplesTable'
import { selectStepSamples, deselectStepSamples } from '../../../modules/labworkSteps/actions'
import api from '../../../utils/api'
import { downloadFromFile } from '../../../utils/download'
import { buildSubmitTemplatesURL } from '../../../modules/labworkSteps/services'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

interface LabworkStepPageProps {
	protocol: Protocol
	step: LabworkSummaryStep
	stepSamples: LabworkStepSamples
	loading: boolean
}

const LabworkStep = ({ protocol, step, stepSamples, loading }: LabworkStepPageProps) => {

	const dispatch = useAppDispatch()
	const navigate = useNavigate()

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

	const canPrefill = stepSamples.prefill.templates.length > 0 && stepSamples.selectedSamples.length > 0
	async function handlePrefillTemplate() {
		// Generate a prefilled template containing the list of selected values.
		// If successful, flush the current selection?
		// TODO : support user selected templates
		if (stepSamples.prefill.templates.length === 0) {
			return
		}
		const templateDescriptor = stepSamples.prefill.templates[0]

		try {
			const result = await dispatch(api.sampleNextStep.prefill.request(templateDescriptor.id, step.id, stepSamples.selectedSamples))
			if (result) {
				downloadFromFile(result.filename, result.data)
			}
		} catch(err) {
			console.error(err)
		}
	}

	const x = () =>{
		return 'a'
	}



	// TODO support multiple templates...
	const submitTemplateUrl = stepSamples.prefill.templates.length ? buildSubmitTemplatesURL(protocol, stepSamples.prefill.templates[0]) : undefined
	const canSubmit = !!submitTemplateUrl

	function handleSubmitTemplate() {
		if (submitTemplateUrl) {
			navigate(submitTemplateUrl)
		}
	}

	return (
		<>
			<AppPageHeader title={protocol.name}>
				<div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between'}}>
					<Title level={5}>{`${step.name}`}</Title>
					<Button type='primary' disabled={!canSubmit} onClick={handleSubmitTemplate}>Submit Template</Button>
				</div>
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
				<div style={{display: 'flex', justifyContent: 'flex-start', alignItems: 'baseline', gap: '1em'}}>
					<Button type='primary' disabled={!canPrefill} onClick={handlePrefillTemplate}>Prefill Template</Button>
					<Text>{`${stepSamples.selectedSamples.length} selected`}</Text>
				</div>
				
			</PageContent>
		</>
	)
}

export default LabworkStep