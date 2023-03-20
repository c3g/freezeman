import { Descriptions, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { Study, Workflow } from '../../models/frontend_models'
import { get as getStudy } from '../../modules/studies/actions'
import { flushStudySamples, getStudySamples } from '../../modules/studySamples/actions'
import { StudySampleList } from '../../modules/studySamples/models'
import { get as getWorkflow } from '../../modules/workflows/actions'
import { selectProjectsByID, selectStudiesByID, selectStudySamplesByID, selectWorkflowsByID } from '../../selectors'
import StudySamples from '../studySamples/StudySamples'

const { Title } = Typography

interface StudyDetailsProps {
    studyId: number
}

const StudyDetails = ({studyId} : StudyDetailsProps) => {
    const dispatch = useAppDispatch()
    const projectsById = useAppSelector(selectProjectsByID)
    const studiesById = useAppSelector(selectStudiesByID)
    const workflowsById = useAppSelector(selectWorkflowsByID)
    const studySamplesState = useAppSelector(selectStudySamplesByID)

    const [study, setStudy] = useState<Study>()
    const [workflow, setWorkflow] = useState<Workflow>()
    const [studySamples, setStudySamples] = useState<StudySampleList>()

    useEffect(() => {
        if (!studyId) {
            return
        }
        const studyInstance = studiesById[studyId]
        if (studyInstance && !studyInstance.isFetching) {
            setStudy(studyInstance)

            const workflowInstance = workflowsById[studyInstance.workflow_id]
            if(workflowInstance && !workflowInstance.isFetching) {
                setWorkflow(workflowInstance)
            } else {
                dispatch(getWorkflow(studyInstance.workflow_id))
            }
        } else {
            dispatch(getStudy(studyId))
        }

        if (!studySamples) {
            const studyState = studySamplesState[studyId]
            if (studyState) {
                if (!studyState.isFetching) {
                    setStudySamples(studyState.data)
                }
            } else {
                dispatch(getStudySamples(studyId))
            }
        }

    }, [studiesById, workflowsById, projectsById, studySamplesState])

    useEffect(() => {
        return () => {
            dispatch(flushStudySamples(studyId))
        }
    }, [studyId])

    function getStepWithOrder(order?: number) {
        if (order && study && workflow) {
            const step = workflow.steps_order.find(step_order => step_order.order === order)
            if (step) {
                return  `${order} - ${step.step_name}`
            }
        }
        return null
    }

    return (
        <>
            <Title level={4}>{`Study ${study?.letter ?? ''}`}</Title>
            <Descriptions bordered={true} size="small" column={4}>
                <Descriptions.Item label="Workflow" span={4}>{workflow?.name ?? ''}</Descriptions.Item>
                <Descriptions.Item label="Start Step" span={2}>{getStepWithOrder(study?.start)}</Descriptions.Item>
                <Descriptions.Item label="End Step" span={2}>{getStepWithOrder(study?.end)}</Descriptions.Item>
            </Descriptions>
            { studySamples && 
                <StudySamples studySamples={studySamples}/>
            }
        </>
        
    )
}

export default StudyDetails