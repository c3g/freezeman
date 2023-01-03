import { Cascader, Collapse, Divider, List, Table, Typography } from 'antd'
import React, { useState } from 'react'


import { DefaultOptionType } from 'antd/lib/cascader'
import { Workflow } from '../../models/frontend_models'
import './WorkflowChooser.scss'

const { Text } = Typography

interface WorkflowChooserProps {
	workflows: Workflow[]
    currentSelection?: Workflow
	onChange?: (workflow?: Workflow) => void
}

const WorkflowChooser = ({ workflows, currentSelection, onChange }: WorkflowChooserProps) => {
	const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | undefined>(currentSelection)

	// Group the workflows by structure.
	const structuredWorkflows: { [key: string]: Workflow[] } = {}
	workflows.forEach((wf) => {
		const structure = wf.structure
		if (!structuredWorkflows[structure]) {
			structuredWorkflows[structure] = []
		}
		structuredWorkflows[structure].push(wf)
	})

	function workflowWasSelected(workflow?: Workflow) {
		setSelectedWorkflow(workflow)
		if (onChange) {
			onChange(workflow)
		}
	}

	function createWorkflowCard(workflow: Workflow) {
		const stepNames = workflow.steps.map((step) => step.name)
		return (
			<Collapse accordion>
				<Collapse.Panel header={workflow.name} key={workflow.name} style={{ width: '100%' }}>
					<List dataSource={stepNames} size="small" renderItem={(item) => {
						return (
							<List.Item key={item}>{item}</List.Item>
						)
					}}></List>
				</Collapse.Panel>
			</Collapse>
		)
	}

	function createWorkflowTable(workflows: Workflow[]) {
		const keyedWorkflows = workflows.map((wf) => {
			return {
				...wf,
				key: wf.id,
			}
		})

		const columns = [
			{
				title: 'Workflow',
				dataIndex: 'name',
				key: 'id',
				render: (_: any, workflow: Workflow) => {
					return createWorkflowCard(workflow)
				},
			},
		]

		const selectedRowKeys: number[] = []
		if (selectedWorkflow) {
			selectedRowKeys.push(selectedWorkflow.id)
		}

		return (
			<Table
				dataSource={keyedWorkflows}
				showHeader={false}
				rowSelection={{
					type: 'radio',
					selectedRowKeys,
					onChange: (_, selectedRows: Workflow[]) => {
						const selectedWorkflow = selectedRows[0] ?? undefined
						workflowWasSelected(selectedWorkflow)
					},
				}}
				columns={columns}
				pagination={false}
				size="small"
			></Table>
		)
	}

	function createWorkflowStructurePanels() {
		const panels: React.ReactNode[] = []
		for (const structureName in structuredWorkflows) {
			const workflows = structuredWorkflows[structureName]
			const workflowNames = workflows.map((wf) => wf.name)

			const table = createWorkflowTable(workflows)
			panels.push(
				<Collapse.Panel header={structureName} key={structureName}>
					{table}
				</Collapse.Panel>
			)
		}
		return panels
	}

	function createCascaderOptions() {
		// Creat the cascader options data - workflows grouped by structure.
        const options: DefaultOptionType[]= []
        for (const structureName in structuredWorkflows) {
            const workflows = structuredWorkflows[structureName]
            const option = {
                value: structureName,
                label: structureName,
                children: workflows.map(wf => {
                    return {
                        value: wf.id,
                        label: wf.name
                    }
                })
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
				const index = workflows.findIndex(wf => wf.id === selectedWorkflow.id)
				if (index !== -1) {
					return ([structureName, selectedWorkflow.id])
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
				onChange = {(option) => {
					const wf = workflows.find((wf) => wf.id === option[1])
					workflowWasSelected(wf)
				}}/>
			<Divider plain orientation='center'>Workflow Details</Divider>
			<Collapse>{createWorkflowStructurePanels()}</Collapse>
		</div>
	)
}

export default WorkflowChooser
