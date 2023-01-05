import { Divider, Select, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { Workflow } from '../../models/frontend_models'

const Text = Typography.Text

export interface WorkflowStepRange {
    start: number
    end: number
}

interface WorkflowStepSelectorProps {
    workflow?: Workflow
    startStep?: number
    endStep?: number
    onChange?: (start?: number, end?: number) => void
}

const WorkflowStepSelector = ({workflow, startStep, endStep, onChange}: WorkflowStepSelectorProps) => {

    const [startStepValue, setStartStepValue] = useState(startStep)
    const [endStepValue, setEndStepValue] = useState(endStep)

    const  workflowStepsData = workflow ? workflow.steps.map((step, index) => ({value: index + 1, label: step.name})) : []

    useEffect(() => {
        if (workflow) {
            const numSteps = workflow.steps.length

            // Assign default values to start and end if they are not already set.
            let adjustedStart = startStep ?? 1
            let adjustedEnd = endStep ?? numSteps

            // Neither value should be higher than the number of steps
            adjustedStart = Math.min(adjustedStart, numSteps)
            adjustedEnd = Math.min(adjustedEnd, numSteps)
            
            // Start must be less than or equal to end
            if (adjustedStart > adjustedEnd) {
                adjustedStart = adjustedEnd
            }
            setStartStepValue(adjustedStart)
            setEndStepValue(adjustedEnd)
        } else {
            setStartStepValue(undefined)
            setEndStepValue(undefined)
        }
    }, [workflow, startStep, endStep])

    return (
        <>
            {/* <Divider plain orientation='center'>Start and End Steps</Divider> */}
            <div style={{display: 'flex',gap: '1rem'}}>
                <Select 
                    disabled={!workflow} 
                    options={workflowStepsData} 
                    value={startStepValue} 
                    onChange={value => {
                        if(onChange) {
                            onChange(value, endStep)
                        }
                    }}></Select>
                <Select 
                    disabled={!workflow} 
                    options={workflowStepsData} 
                    value={endStepValue}
                    onChange={value => {
                        if(onChange) {
                            onChange(startStep, value)
                        }
                    }}
                    ></Select>
            </div>
        </> 
    )
}

export default WorkflowStepSelector