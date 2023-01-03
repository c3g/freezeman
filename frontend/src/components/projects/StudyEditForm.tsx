import React from 'react'
import { Button, Form, Input, Space } from 'antd'
import WorkflowChooser from './WorkflowChooser'
import { useNavigate } from 'react-router-dom'
import { Project, ReferenceGenome, Workflow } from '../../models/frontend_models'
import ReferenceGenomeSelect from './ReferenceGenomeSelect'

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
}

type StudyEditCallback = (referenceGenome?: ReferenceGenome, workflow?: Workflow) => void

const StudyEditForm = ({project, study, workflows, isCreatingStudy, onSubmit} : CreateStudyFormProps) => {

    const navigate = useNavigate()

    function handleSubmit(values: FormData) {
        onSubmit(values.referenceGenome, values.workflow)
    }

    function handleCancel() {
        navigate(-1)
    }

    return (
        <Form 
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
                <WorkflowChooser workflows={workflows} currentSelection={study?.workflow}/>
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