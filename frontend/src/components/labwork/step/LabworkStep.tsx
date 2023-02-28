import { Button, Select, Space, Tabs, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../../../hooks'
import { FMSId } from '../../../models/fms_api_models'
import { Protocol, Step } from '../../../models/frontend_models'
import { setSelectedSamples } from '../../../modules/labworkSteps/actions'
import { LabworkPrefilledTemplateDescriptor, LabworkStepSamples } from '../../../modules/labworkSteps/models'
import api from '../../../utils/api'
import { downloadFromFile } from '../../../utils/download'
import AppPageHeader from '../../AppPageHeader'
import PageContent from '../../PageContent'
import { getColumnsForStep } from '../../shared/WorkflowSamplesTable/ColumnSets'
import WorkflowSamplesTable from '../../shared/WorkflowSamplesTable/WorkflowSamplesTable'

const { Title } = Typography

interface LabworkStepPageProps {
	protocol: Protocol
	step: Step
	stepSamples: LabworkStepSamples
}

const LabworkStep = ({ protocol, step, stepSamples }: LabworkStepPageProps) => {
	const [selectedTemplate, setSelectedTemplate] = useState<LabworkPrefilledTemplateDescriptor>()
	const dispatch = useAppDispatch()
	const navigate = useNavigate()

	const columnsForSamplesTable = [...getColumnsForStep(step, protocol)]
	const columnsForSelectedSamplesTable = [...getColumnsForStep(step, protocol)]

	// Set the currently selected template to the first template available, not already set.
	useEffect(() => {
		if(!selectedTemplate) {
			if (stepSamples.prefill.templates.length > 0) {
				const template = stepSamples.prefill.templates[0]
				setSelectedTemplate(template)
			} else {
				console.error('No templates are associated with step!')
			}
		}
	}, [stepSamples])

	// Handle the prefill template button
	const canPrefill = selectedTemplate && stepSamples.selectedSamples.length > 0

	async function handlePrefillTemplate() {
		// Generate a prefilled template containing the list of selected values.		
		if (selectedTemplate) {
			try {
				const result = await dispatch(api.sampleNextStep.prefill.request(selectedTemplate.id, step.id, stepSamples.selectedSamples))
				if (result) {
					downloadFromFile(result.filename, result.data)
				}
			} catch(err) {
				console.error(err)
			}
		}
	}
	
	// Submit Template handler
	const canSubmit = selectedTemplate && selectedTemplate.submissionURL

	function handleSubmitTemplate() {
		if (selectedTemplate && selectedTemplate.submissionURL) {
			navigate(selectedTemplate.submissionURL)
		}
	}

	// Selection handler for sample selection checkboxes
	const selectionProps = {
		selectedSampleIDs: stepSamples.selectedSamples,
		onSelectionChanged: (selectedSamples) => {
			const ids = selectedSamples.reduce((acc, selected) => {
				if (selected.sample) {
					acc.push(selected.sample.id)
				}
				return acc
			}, [] as FMSId[])
			dispatch(setSelectedSamples(step.id, ids))
		},
	}

	// Display the number of selected samples in the tab title
	const selectedTabTitle= `Selection (${stepSamples.selectedSamples.length} ${stepSamples.selectedSamples.length === 1 ? "sample" : "samples"} selected)`

	return (
		<>
			<AppPageHeader title={protocol.name}>
				<div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between'}}>
					<Title level={5}>{`${step.name}`}</Title>
					<Space>
						{stepSamples.prefill.templates.length > 1 &&
							<Select 
								defaultActiveFirstOption
								style={{width: '24em'}}
								value={selectedTemplate?.id ?? 0}
								options={stepSamples.prefill.templates.map(template => {
									return {
										value: template.id,
										label: template.description
									}
								})}
								onChange={value => {
									const template = stepSamples.prefill.templates.find(template => template.id === value)
									if (template) {
										setSelectedTemplate(template)
									}
								}}
							/>
						}
						<Button type='primary' disabled={!canPrefill} onClick={handlePrefillTemplate}>Prefill Template</Button>
						<Button type='primary' disabled={!canSubmit} onClick={handleSubmitTemplate}>Submit Template</Button>
					</Space>
				</div>
			</AppPageHeader>
			<PageContent loading={stepSamples.pagedItems.isFetching} >
				<Tabs defaultActiveKey='samples'>
					<Tabs.TabPane tab='Samples' key='samples'>
						<WorkflowSamplesTable 
							sampleIDs={stepSamples.displayedSamples} 
							columns={columnsForSamplesTable}
							selection={selectionProps}
							/>
					</Tabs.TabPane>
					<Tabs.TabPane tab={selectedTabTitle} key='selection'>
						<WorkflowSamplesTable 
							sampleIDs={stepSamples.selectedSamples}
							columns={columnsForSelectedSamplesTable}
							selection={selectionProps}/>
					</Tabs.TabPane>
				</Tabs>
			</PageContent>
		</>
	)
}

export default LabworkStep