import { SyncOutlined } from '@ant-design/icons'
import { Button, Select, Space, Tabs, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../../../hooks'
import { FMSId } from '../../../models/fms_api_models'
import { Protocol, Step } from '../../../models/frontend_models'
import { clearSelectedSamples, flushSamplesAtStep, refreshSamplesAtStep, requestPrefilledTemplate, updateSelectedSamplesAtStep } from '../../../modules/labworkSteps/actions'
import { LabworkPrefilledTemplateDescriptor, LabworkStepSamples } from '../../../modules/labworkSteps/models'
import { downloadFromFile } from '../../../utils/download'
import AppPageHeader from '../../AppPageHeader'
import PageContent from '../../PageContent'
import { getColumnsForStep } from '../../shared/WorkflowSamplesTable/ColumnSets'
import WorkflowSamplesTable from '../../shared/WorkflowSamplesTable/WorkflowSamplesTable'

const { Text } = Typography

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

	const canRefresh = true
	function handleRefresh() {
		dispatch(refreshSamplesAtStep(step.id))
	}

	// Handle the prefill template button
	const canPrefill = selectedTemplate && stepSamples.selectedSamples.length > 0

	async function handlePrefillTemplate() {
		// Generate a prefilled template containing the list of selected values.		
		if (selectedTemplate) {
			try {
				const result = await dispatch(requestPrefilledTemplate(selectedTemplate.id, step.id))
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
		dispatch(flushSamplesAtStep(step.id))
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
			dispatch(updateSelectedSamplesAtStep(step.id, ids))
		},
	}

	const canClearSelection = stepSamples.selectedSamples.length !== 0
	function handleClearSelection() {
		dispatch(clearSelectedSamples(step.id))
	}

	// Display the number of selected samples in the tab title
	const selectedTabTitle = `Selection (${stepSamples.selectedSamples.length} ${stepSamples.selectedSamples.length === 1 ? "sample" : "samples"} selected)`

	const buttonBar = (
		<Space>
			<Button type='primary' disabled={!canPrefill} onClick={handlePrefillTemplate} title='Download a prefilled template with the selected samples'>Prefill Template</Button>
			<Button type='default' disabled={!canSubmit} onClick={handleSubmitTemplate} title='Submit a prefilled template'>Submit Template</Button>
			<Button icon={<SyncOutlined/>}title='Refresh the list of samples' disabled={!canRefresh} onClick={() => handleRefresh()}>Refresh</Button>
		</Space>
	)

	return (
		<>
			<AppPageHeader title={step.name} extra={buttonBar}>
				{stepSamples.prefill.templates.length > 1 &&
					<div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'left'}}>
						<Space>
							<Text strong>Template:</Text>
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
						</Space>
					</div>
				}		
			</AppPageHeader>
			<PageContent loading={stepSamples.pagedItems.isFetching} >
				<Tabs defaultActiveKey='samples' tabBarExtraContent={
					<Button onClick={() => handleClearSelection()} disabled={!canClearSelection} title='Deselect all samples'>Clear Selection</Button>
				}>
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