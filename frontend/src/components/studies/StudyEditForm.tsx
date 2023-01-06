import { Button, Form, Space } from 'antd'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Project, ReferenceGenome, Workflow, WorkflowStepRange } from '../../models/frontend_models'
import ReferenceGenomeSelect from './ReferenceGenomeSelect'
import WorkflowCascadeMenu from './WorkflowCascadeMenu'
import WorkflowCollapsableList from './WorkflowCollapsableList'
import WorkflowStepSelector from './WorkflowStepSelector'

const { Item } = Form

interface CreateStudyFormProps {
	project: Project
	study?: any
	workflows: Workflow[]
	isCreatingStudy: boolean
	onSubmit: StudyEditCallback
}

interface FormData {
	referenceGenome?: ReferenceGenome
	workflow?: Workflow
	stepRange?: WorkflowStepRange
}

type StudyEditCallback = (referenceGenome?: ReferenceGenome, workflow?: Workflow, stepRange?: WorkflowStepRange) => void

const StudyEditForm = ({ project, study, workflows, isCreatingStudy, onSubmit }: CreateStudyFormProps) => {
	const navigate = useNavigate()

	const [form] = Form.useForm<FormData>()
	const selectedWorkflow = Form.useWatch<Workflow>('workflow', form)
	const stepRange = Form.useWatch<WorkflowStepRange>('stepRange', form)

	function handleSubmit(values: FormData) {
		onSubmit(values.referenceGenome, values.workflow, values.stepRange)
	}

	function handleCancel() {
		navigate(-1)
	}

	function workflowWasSelected(workflow?: Workflow) {
		// Both the cascader menu and the collapse components can be used to
		// set the selected workflow, so this method sets the workflow
		// field in the form data (instead of antd setting it automatically).
		// Also, whenever the workflow changes, we have to reset the step range.
		form.setFieldValue('workflow', workflow)
		if (workflow) {
			const start = 1
			const end = workflow.steps.length
			form.setFieldValue('stepRange', { start, end })
		} else {
			form.setFieldValue('stepRange', undefined)
		}
	}

	return (
		<Form form={form} name="edit-study" labelCol={{ span: 4 }} wrapperCol={{ span: 12 }} layout="horizontal" onFinish={handleSubmit}>
			<Item name="referenceGenome" label="Refererence Genome">
				{/* TODO pass currently selected reference genome id if editing */}
				<ReferenceGenomeSelect />
			</Item>
			<Item name="workflow" label="Workflow" rules={[{ required: true, message: 'A workflow must be selected for the study.' }]}>
				{/* TODO disable the workflow chooser if user is editing a study (unless we allow
                    the user to change the workflow after the study has been created) 
                */}
				<WorkflowCascadeMenu workflows={workflows} selectedWorkflow={selectedWorkflow} onChange={workflowWasSelected} />
			</Item>
			<Item
				name="stepRange"
				label="Start and End Steps"
				rules={[
					{
						required: true,
						type: 'object',
					},
					{
						validator: async (_, value) => {
							if (value && value.start && value.end) {
								if (value.start > value.end) {
									throw Error('Start step must preceed end step.')
								}
							}
						},
					},
				]}
			>
				<WorkflowStepSelector
					workflow={selectedWorkflow}
					startStep={stepRange?.start}
					endStep={stepRange?.end}
					onChange={(stepRange) => {
						form.setFieldValue('stepRange', stepRange)
					}}
				/>
			</Item>
			<Item label="Workflow Details">
				<WorkflowCollapsableList
					workflows={workflows}
					selectedWorkflow={selectedWorkflow}
					onChange={(workflow) => {
						form.setFieldValue('workflow', workflow)
					}}
				/>
			</Item>
			<Item>
				<Space>
					<Button type="primary" htmlType="submit">
						Create
					</Button>
					<Button onClick={handleCancel}>Cancel</Button>
				</Space>
			</Item>
		</Form>
	)
}

export default StudyEditForm
