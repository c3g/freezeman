import React from 'react'
import { Button, Divider, Form, Input, Space } from 'antd'
import WorkflowChooser from './WorkflowChooser'
import { useNavigate } from 'react-router-dom'
import { Project, ReferenceGenome, Workflow } from '../../models/frontend_models'
import ReferenceGenomeSelect from './ReferenceGenomeSelect'
import WorkflowCollapsableList from './WorkflowCollapsableList'
import WorkflowStepSelector from './WorkflowStepSelector'
import WorkflowAutoComplete from './WorkflowAutocomplete'
import WorkflowCascadeMenu from './WorkflowCascadeMenu'

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
    stepRange?: {start?: number, end?: number}
}

type StudyEditCallback = (referenceGenome?: ReferenceGenome, workflow?: Workflow, stepRange?: {start?: number, end?:number}) => void


const StudyEditForm = ({project, study, workflows, isCreatingStudy, onSubmit} : CreateStudyFormProps) => {

    const navigate = useNavigate()

    const [form] = Form.useForm<FormData>()
    const selectedWorkflow = Form.useWatch('workflow', form)
    const stepRange = Form.useWatch('stepRange', form)

    function handleSubmit(values: FormData) {
        onSubmit(values.referenceGenome, values.workflow, values.stepRange)
    }

    function handleCancel() {
        navigate(-1)
    }

    return (
        <Form
            form={form} 
            name="edit-study"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 12 }}
            layout="horizontal"
            onFinish={handleSubmit}
        >
            <Item
                name="referenceGenome"
                label = "Refererence Genome"
            >
                {/* TODO pass currently selected reference genome id if editing */}
                <ReferenceGenomeSelect/>
            </Item>
            <Item 
                name="workflow" 
                label="Workflow"
                rules={[{ required: true, message: 'A workflow must be selected for the study.'}]}
            >
                {/* TODO disable the workflow chooser if user is editing a study (unless we allow
                    the user to change the workflow after the study has been created) 
                */}
                {/* <WorkflowChooser workflows={workflows} currentSelection={selectedWorkflow}/>                 */}
                {/* <WorkflowAutoComplete workflows={workflows} selectedWorkflow={selectedWorkflow}/> */}
                <WorkflowCascadeMenu workflows={workflows} selectedWorkflow={selectedWorkflow}/>
            </Item>
            <Item
                name="stepRange"
                label="Start and End Steps"
            >
                <WorkflowStepSelector 
                    workflow={selectedWorkflow} 
                    startStep={stepRange?.start}
                    endStep={stepRange?.end}
                    onChange={(start, end ) => {
                        form.setFieldValue('stepRange', {start, end})
                    }}
                />
            </Item>
            <Item label="Workflow Details">
                {/* <Divider plain orientation='center'>Workflow Details</Divider> */}
			    <WorkflowCollapsableList workflows={workflows} selectedWorkflow={selectedWorkflow} onChange={(workflow) => {form.setFieldValue('workflow', workflow)}}/>
            </Item>
            <Item>
                <Space>
                    <Button type="primary" htmlType='submit'>Create</Button>
                    <Button onClick={handleCancel}>Cancel</Button>
                </Space>
                
            </Item> 
        </Form>
    )
}

export default StudyEditForm