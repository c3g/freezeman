import { Button, Form, FormItemProps, Input, Space } from 'antd'
import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Workflow, WorkflowStepRange } from '../../models/frontend_models'
import WorkflowCascadeMenu from './WorkflowCascadeMenu'
import WorkflowCollapsableList from './WorkflowCollapsableList'
import WorkflowStepSelector from './WorkflowStepSelector'

const { Item } = Form

interface FormErrors {
	[key: string] : string[]
}

interface CreateStudyFormProps {
	workflows: Workflow[]
	isCreatingStudy: boolean
	onSubmit: StudyEditCallback
	formErrors?: FormErrors
}

interface FormData {
	workflow?: Workflow
	stepRange?: WorkflowStepRange
	description?: string
}

type StudyEditCallback = (workflow?: Workflow, stepRange?: WorkflowStepRange, description?: string | null) => void

function StudyEditForm({ workflows, isCreatingStudy, onSubmit, formErrors }: CreateStudyFormProps) {
	const navigate = useNavigate()

	const [form] = Form.useForm<FormData>()
	const selectedWorkflow = Form.useWatch<Workflow>('workflow', form)
	const stepRange = Form.useWatch<WorkflowStepRange>('stepRange', form)

	const handleSubmit = useCallback((values: FormData) => {
		const finalValues = serialize(values)
		onSubmit(finalValues.workflow, finalValues.stepRange, finalValues.description)
	}, [onSubmit])

	const handleCancel = useCallback(() => {
		navigate(-1)
	}, [navigate])

	const workflowWasSelected = useCallback((workflow?: Workflow) => {
		// Both the cascader menu and the collapse components can be used to
		// set the selected workflow, so this method sets the workflow
		// field in the form data (instead of antd setting it automatically).
		// Also, whenever the workflow changes, we have to reset the step range.
		form.setFieldValue('workflow', workflow)
		if (workflow) {
			const start = 1
			const end = workflow.steps_order.length
			form.setFieldValue('stepRange', { start, end })
		} else {
			form.setFieldValue('stepRange', undefined)
		}
	}, [form])

	const itemValidation = useCallback((key: string) => {
		if (formErrors && formErrors[key]) {
			return {
				validateStatus: 'error',
				help: formErrors[key]
			} as Pick<FormItemProps, 'validateStatus' | 'help'>
		}
		return {}
	}, [formErrors])

	const onChangeForStepRange = useCallback((stepRange: WorkflowStepRange) => {
		form.setFieldValue('stepRange', stepRange)
	}, [form])

	const onChangeForDescription = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
		form.setFieldValue('description', event.target.value)
	}, [form])

	return (
		<Form form={form} name="edit-study" labelCol={{ span: 4 }} wrapperCol={{ span: 12 }} layout="horizontal" onFinish={handleSubmit}>
			<Item 
				name="workflow" 
				label="Workflow" 
				{...itemValidation('workflow')}
				rules={[{ required: true, message: 'A workflow must be selected for the study.' }]}>
				{/* TODO disable the workflow chooser if user is editing a study (unless we allow
                    the user to change the workflow after the study has been created) 
                */}
				<WorkflowCascadeMenu workflows={workflows} selectedWorkflow={selectedWorkflow} onChange={workflowWasSelected} />
			</Item>
			<Item
				name="stepRange"
				label="Start and End Steps"
				{...itemValidation('step_range')}
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
					onChange={onChangeForStepRange}
				/>
			</Item>
			<Item label="Workflow Details">
				<WorkflowCollapsableList
					workflows={workflows}
					selectedWorkflow={selectedWorkflow}
					onChange={workflowWasSelected}
				/>
			</Item>
			<Item
				name="description"
				label="Description"
				{...itemValidation('description')}
			>
				<Input.TextArea
					defaultValue={''}
					onChange={onChangeForDescription}
				/>
			</Item>
			<Item>
				<Space>
					<Button type="primary" htmlType="submit">
						{isCreatingStudy ? 'Create' : 'Submit'}
					</Button>
					<Button onClick={handleCancel}>Cancel</Button>
				</Space>
			</Item>
		</Form>
	)
}

interface SerializedFormData {
	workflow?: Workflow
	stepRange?: WorkflowStepRange
	description?: string | null
}

function serialize(values: FormData): SerializedFormData {
	return {
		...values,
		description: values.description === '' ? null : values.description
	}
  }

export default StudyEditForm
