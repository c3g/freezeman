import { Collapse, List, Table, Typography } from 'antd'
import React from 'react'
import { Workflow } from '../../models/frontend_models'
import { createStructuredWorkflows } from './StructuredWorkflows'
import './WorkflowCollapsableList.scss'
import { TableRowSelection } from 'antd/lib/table/interface'
const { Text } = Typography

interface WorkflowCollapsableListProps {
	workflows: Workflow[]
	selectedWorkflow?: Workflow
	onChange?: (workflow?: Workflow) => void
}

const WorkflowCollapsableList = ({ workflows, selectedWorkflow, onChange }: WorkflowCollapsableListProps) => {

	const structuredWorkflows = createStructuredWorkflows(workflows)

	function workflowWasSelected(workflow?: Workflow) {
		if (onChange) {
			onChange(workflow)
		}
	}

	function createWorkflowCard(workflow: Workflow) {
		const stepNames = workflow.steps_order.map((step) => {
			return {
				stepName: step.step_name,
				stepOrder: step.order

			}
		})
		return (
			<Collapse accordion items={[
				{
					key: 'step-names',
					label: workflow.name,
					children: <List
						dataSource={stepNames}
						size="small"
						renderItem={(item) => {
							return <List.Item key={`${item.stepOrder}-${item.stepName}`}>
								<span>
									<Text strong={true} style={{fontSize: 16, marginRight: "0.6rem"}}>{item.stepOrder}</Text>
									<Text>{item.stepName}</Text>
								</span>
							</List.Item>
						}}
					/>
				}
			]} />
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

		// Workflows are selectable if an onChange callback is provided, in which
		// case the table displays selection radio controls.
		let rowSelection: TableRowSelection<any> | undefined
		if (onChange) {
			const selectedRowKeys: number[] = []
			if (selectedWorkflow) {
				selectedRowKeys.push(selectedWorkflow.id)
			}

			rowSelection = {
				type: 'radio',
				selectedRowKeys,
				onChange: (_, selectedRows: Workflow[]) => {
					const selectedWorkflow = selectedRows[0] ?? undefined
					workflowWasSelected(selectedWorkflow)
				},
			}
		}

		return (
			<Table
				dataSource={keyedWorkflows}
				showHeader={false}
				rowSelection={rowSelection}
				columns={columns}
				pagination={false}
				size="small"
			></Table>
		)
	}

	return <Collapse defaultActiveKey={selectedWorkflow?.structure} items={
		Object.entries(structuredWorkflows).map(([structureName, workflows]) => {
			const table = createWorkflowTable(workflows)
			return {
				key: structureName,
				label: <Text strong>{structureName}</Text>,
				children: table,
			}
		})
	} />
}

export default WorkflowCollapsableList
