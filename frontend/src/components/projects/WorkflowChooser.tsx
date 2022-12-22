import React, { useState } from 'react'
import { Badge, Checkbox, Col, Collapse, Divider, List, Select, Space, Table, Typography } from 'antd'


import './WorkflowChooser.scss'
import { Workflow } from '../../models/frontend_models'

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

	const workflowWasSelected = (workflow?: Workflow) => {
		setSelectedWorkflow(workflow)
		if (onChange) {
			onChange(workflow)
		}
	}

	const createWorkflowCard = (workflow: Workflow) => {
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

	const createWorkflowTable = (workflows: Workflow[]) => {
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

	const createWorkflowStructurePanels = () => {
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

	return (
		<div className="workflow-chooser">
			<Select
				showSearch
				placeholder='Select a workflow'
				options = {
					workflows.map(wf => {
						return {
							name: wf.name,
							value: wf.name
						}
					})
				}
				value={selectedWorkflow?.name}
				onChange = {(workflowName) => {
					const wf = workflows.find((wf) => wf.name === workflowName)
					workflowWasSelected(wf)

				}}
			></Select>
			<Divider plain orientation='center'>Workflow Details</Divider>
			<Collapse>{createWorkflowStructurePanels()}</Collapse>
		</div>
	)
}

export default WorkflowChooser
