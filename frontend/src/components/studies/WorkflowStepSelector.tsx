import { Select, Typography } from 'antd'
import { DefaultOptionType } from 'antd/lib/select'
import React, { useEffect, useState } from 'react'
import { Workflow, WorkflowStepRange } from '../../models/frontend_models'

const Text = Typography.Text


interface WorkflowStepSelectorProps {
    workflow?: Workflow
    startStep?: number
    endStep?: number
    onChange?: (stepRange: WorkflowStepRange) => void
}


const WorkflowStepSelector = ({workflow, startStep, endStep, onChange}: WorkflowStepSelectorProps) => {

    const [stepOptions, setStepOptions] = useState<DefaultOptionType[]>([])

    useEffect(() => {
        if (workflow) {
            const options = workflow.steps.map((step, index) => ({value: index + 1, label: step.name}))
            setStepOptions(options)
        } else {
            setStepOptions([])
        }
    }, [workflow])

    return (
        <>
            <div style={{display: 'flex',gap: '1rem'}}>
                <Select 
                    disabled={!workflow} 
                    options={stepOptions} 
                    value={startStep} 
                    onChange={value => {
                        if (onChange && startStep && endStep) {
                            onChange({start: value, end: endStep})
                        }
                    }}></Select>
                <Select 
                    disabled={!workflow} 
                    options={stepOptions} 
                    value={endStep}
                    onChange={value => {
                        if (onChange && startStep && endStep) {
                            onChange({start: startStep ?? 0, end: value})
                        }
                    }}
                    ></Select>
            </div>
        </> 
    )
}

export default WorkflowStepSelector