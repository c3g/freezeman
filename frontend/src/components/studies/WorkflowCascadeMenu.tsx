import { Cascader, Typography } from 'antd'
import { DefaultOptionType } from 'antd/lib/cascader'
import React from 'react'
import { Workflow } from '../../models/frontend_models'
import { createStructuredWorkflows } from './StructuredWorkflows'

const { Text } = Typography

interface WorkflowCascadeMenuProps {
	workflows: Workflow[]
	selectedWorkflow?: Workflow
	onChange?: (workflow?: Workflow) => void
}

const WorkflowCascadeMenu = ({ workflows, selectedWorkflow, onChange }: WorkflowCascadeMenuProps) => {
	const structuredWorkflows = createStructuredWorkflows(workflows)

	// TODO Include a 'read only' mode if user is not allowed to update the selected
	// workflow.

	function workflowWasSelected(workflow?: Workflow) {
		if (onChange) {
			onChange(workflow)
		}
	}

	function createCascaderOptions() {
		// Creat the cascader options data - workflows grouped by structure.
		const options: DefaultOptionType[] = []
		for (const structureName in structuredWorkflows) {
			const workflows = structuredWorkflows[structureName]
			const option = {
				value: structureName,
				label: structureName,
				children: workflows.map((wf) => {
					return {
						value: wf.id,
						label: wf.name,
					}
				}),
			}
			options.push(option)
		}
		return options
	}

	function createCascaderValue() {
		// Create the cascader selection, which is an array of option values to the selected workflow.
		if (selectedWorkflow) {
			for (const structureName in structuredWorkflows) {
				const workflows = structuredWorkflows[structureName]
				const index = workflows.findIndex((wf) => wf.id === selectedWorkflow.id)
				if (index !== -1) {
					return [structureName, selectedWorkflow.id]
				}
			}
		}
		return []
	}

	return (
		<div className="workflow-chooser">
			<Cascader
				showSearch
				options={createCascaderOptions()}
				value={createCascaderValue()}
				placeholder={'Please select a workflow'}
				onChange={(option) => {
					const wf = workflows.find((wf) => wf.id === option[1])
					workflowWasSelected(wf)
				}}
			/>
		</div>
	)
}

export default WorkflowCascadeMenu
