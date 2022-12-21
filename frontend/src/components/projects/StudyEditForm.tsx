import React from 'react'
import { Button, Form, Input, Space } from 'antd'
import { FakeWorkflow } from './FakeWorkflows'
import WorkflowChooser from './WorkflowChooser'
import { useNavigate } from 'react-router-dom'

const { Item } = Form



interface CreateStudyFormProps {
    project: any
    study?: any
    workflows: FakeWorkflow[]
}

const StudyEditForm = ({project, study, workflows} : CreateStudyFormProps) => {

    const navigate = useNavigate()

    // Create a default name for the study

    function handleSubmit(values: any) {
        console.log(values)
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
                name="studyName"
                label="Name" 
                rules={[{ required: true, message: 'A study name is required.'}]}
            >
                <Input placeholder="Study Name" value={study?.name} />
            </Item>
            <Item
                name="referenceGenome"
                label = "Refererence Genome"
            >
                {/* TODO add support for reference genome */}
                <Input/>
            </Item>
            <Item 
                name="workflow" 
                label="Workflow"
                rules={[{ required: true, message: 'A workflow must be selected for the study.'}]}
            >
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