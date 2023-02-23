import { Button, Checkbox, Select, TableColumnType, Tabs, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../../../hooks'
import { Protocol, Step } from '../../../models/frontend_models'
import { deselectStepSamples, selectStepSamples } from '../../../modules/labworkSteps/actions'
import { LabworkPrefilledTemplateDescriptor, LabworkStepSamples } from '../../../modules/labworkSteps/models'
import api from '../../../utils/api'
import { downloadFromFile } from '../../../utils/download'
import AppPageHeader from '../../AppPageHeader'
import PageContent from '../../PageContent'
import WorkflowSamplesTable from '../../shared/WorkflowSamplesTable/WorkflowSamplesTable'

const { Title, Text } = Typography

interface LabworkStepPageProps {
	protocol: Protocol
	step: Step
	stepSamples: LabworkStepSamples
}

const LabworkStep = ({ protocol, step, stepSamples }: LabworkStepPageProps) => {
	const [currentError, setCurrentError] = useState<string>()
	const [selectedTemplate, setSelectedTemplate] = useState<LabworkPrefilledTemplateDescriptor>()
	const dispatch = useAppDispatch()
	const navigate = useNavigate()

	// Create the selection checkbox columns for the two tables
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

	// Set the currently selected template to the first template available, not already set.
	useEffect(() => {
		if(!selectedTemplate) {
			if (stepSamples.prefill.templates.length > 0) {
				const template = stepSamples.prefill.templates[0]
				//const submissionURL = buildSubmitTemplatesURL(protocol, template)
				setSelectedTemplate(template)
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
	
	const canSubmit = selectedTemplate && selectedTemplate.submissionURL

	function handleSubmitTemplate() {
		if (selectedTemplate && selectedTemplate.submissionURL) {
			navigate(selectedTemplate.submissionURL)
		}
	}

	// Display the number of selected samples in the tab title
	const selectedTabTitle= `Selection (${stepSamples.selectedSamples.length})`

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
					<Tabs.TabPane tab={selectedTabTitle} key='selection'>
						<WorkflowSamplesTable stepName={step.name} protocol={protocol} sampleIDs={stepSamples.selectedSamples} prefixColumn={selectionCheckboxColumn}/>
					</Tabs.TabPane>
				</Tabs>
				<div style={{display: 'flex', justifyContent: 'flex-start', alignItems: 'baseline', gap: '1em'}}>
					<Button type='primary' disabled={!canPrefill} onClick={handlePrefillTemplate}>Prefill Template</Button>
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
					<Text>{`${stepSamples.selectedSamples.length} samples selected`}</Text>
				</div>
				
			</PageContent>
		</>
	)
}

export default LabworkStep