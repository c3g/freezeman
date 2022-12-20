import React from 'react'
import { Button, Form, Input } from 'antd'
import { FakeWorkflow } from './FakeWorkflows'
import WorkflowChooser from './WorkflowChooser'

const { Item } = Form



interface CreateStudyFormProps {
    project: any
    workflows: FakeWorkflow[]
}

const CreateStudyForm = ({project, workflows} : CreateStudyFormProps) => {

    // Create a default name for the study

    function handleSubmit(values: any) {
        console.log(values)
    }

    return (
        <Form 
            name="create-study"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 12 }}
            layout="horizontal"
            onFinish={handleSubmit}
        >
            <Item 
                name="studyName"
                label="Name" 
                required
            >
                <Input placeholder="Study Name"/>
            </Item>
            <Item
                name="referenceGenome"
                label = "Refererence Genome"
            >
                <Input/>
            </Item>
            <Item name="worflow" label="Workflow" required>
                <WorkflowChooser workflows={workflows} onChange={() => {}}/>
            </Item>
            <Item>
                <Button type="primary" htmlType='submit'>Create</Button>
            </Item>
        </Form>
    )
}

export default CreateStudyForm