import { Cascader, Collapse, Divider, List, Select, Table, Typography } from 'antd'
import React, { useState } from 'react'


import { DefaultOptionType } from 'antd/lib/cascader'
import { Workflow } from '../../models/frontend_models'
import './WorkflowChooser.scss'
import WorkflowCollapsableList from './WorkflowCollapsableList'
import { createStructuredWorkflows } from './StructuredWorkflows'
import WorkflowCascadeMenu from './WorkflowCascadeMenu'
import WorkflowStepSelector from './WorkflowStepSelector'
import WorkflowAutoComplete from './WorkflowAutocomplete'

const { Text } = Typography

// interface StructuredWorkflows {
//     [key: string] : Workflow[]
// }

// function createStructuredWorkflows(workflows: Workflow[]) {
//     const structuredWorkflows: StructuredWorkflows = {}
// 	workflows.forEach((wf) => {
// 		const structure = wf.structure
// 		if (!structuredWorkflows[structure]) {
// 			structuredWorkflows[structure] = []
// 		}
// 		structuredWorkflows[structure].push(wf)
// 	})
// }

interface WorkflowChooserProps {
	workflows: Workflow[]
    currentSelection?: Workflow
	onChange?: (workflow?: Workflow) => void
}

const WorkflowChooser = ({ workflows, currentSelection, onChange }: WorkflowChooserProps) => {
	const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | undefined>(currentSelection)
	const [startStep, setStartStep] = useState<number>()
	const [endStep, setEndStep] = useState<number>()

	// TODO Include a 'read only' mode if user is not allowed to update the selected
	// workflow.

	function workflowWasSelected(workflow?: Workflow) {
		setSelectedWorkflow(workflow)
		if (onChange) {
			onChange(workflow)
		}
		if (workflow) {
			setStartStep(1)
			setEndStep(workflow.steps.length)
		} else {
			setStartStep(undefined)
			setEndStep(undefined)
		}
	}

	return (
		<div className="workflow-chooser">
			{/* <WorkflowCascadeMenu workflows={workflows} selectedWorkflow={selectedWorkflow} onChange={workflowWasSelected}/> */}
			<WorkflowAutoComplete workflows={workflows} selectedWorkflow={selectedWorkflow} onChange={wf => workflowWasSelected(wf)}/>
			{/* <WorkflowStepSelector workflow={selectedWorkflow} startStep={startStep} endStep={endStep} onChange={(start, end) => {
				setStartStep(start)
				setEndStep(end)
			}}/> */}
			{/* <Divider plain orientation='center'>Workflow Details</Divider>
			<WorkflowCollapsableList workflows={workflows} selectedWorkflow={selectedWorkflow} onChange={workflowWasSelected}/> */}
		</div>
	)
}

export default WorkflowChooser
