import { AutoComplete } from 'antd';
import React, { useEffect, useState } from 'react'
import { Workflow } from "../../models/frontend_models";


interface WorkflowAutoCompleteProps {
    workflows: Workflow[]
    selectedWorkflow?: Workflow
    onChange?: (workflow: Workflow) => void 
}

const WorkflowAutoComplete = ({workflows, selectedWorkflow, onChange}: WorkflowAutoCompleteProps) => {

    const [value, setValue] = useState<string>(selectedWorkflow?.name ?? '')

    useEffect(() => {
        if (selectedWorkflow) {
            setValue(selectedWorkflow.name)
        } else {
            setValue('')
        }
    }, [selectedWorkflow])

    const options = workflows.map(wf => ({value: wf.name}))

    function handleSelect(workflowName) {
        const selected = workflows.find(wf => wf.name === workflowName)
        if (selected && onChange) {
            onChange(selected)
        }
    }

    return (
        <AutoComplete options={options} filterOption allowClear value={value} onSelect={handleSelect} onChange={data => setValue(data)}></AutoComplete>
    )
}

export default WorkflowAutoComplete