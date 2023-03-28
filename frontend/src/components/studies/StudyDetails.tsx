import { Descriptions, Space, Spin, Typography } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { Study, Workflow } from '../../models/frontend_models'
import { get as getStudy } from '../../modules/studies/actions'
import { flushStudySamples, getStudySamples, refreshStudySamples } from '../../modules/studySamples/actions'
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
                return
            }
        } else {
            dispatch(getStudy(studyId))
            return
        }

        const studyState = studySamplesState[studyId]
        if (!studyState && study && workflow) {
            dispatch(getStudySamples(studyId))
        } 
    }, [studiesById, workflowsById, projectsById, studySamplesState, study, workflow])

    useEffect(() => {
        // The effect ensure that whenever the study samples state changes we display
        // the most recent state. The state will change if changes in labwork are detected
        // and the study samples are refreshed.
        const studyState = studySamplesState[studyId]
        if (studyState) {
            if (!studyState.isFetching) {
                setStudySamples(studyState.data)
            }
        } 
    }, [studySamplesState])

    useEffect(() => {
        return () => {
            dispatch(flushStudySamples(studyId))
        }
    }, [studyId])

    const refreshSamples = useCallback(() => {
        dispatch(refreshStudySamples(studyId))
    }, [studyId, dispatch])

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
            { studySamples ? 
                <StudySamples studySamples={studySamples} refreshSamples={refreshSamples}/>
                :
                // Display the "Samples" title with a spinner until data is ready.
                // Afterward, StudySamples displays the title (along with the Hide Empty Steps button)
                <Space align='baseline'>
                    <Title level={4} style={{ marginTop: '1.5rem' }}>Samples</Title>
                    { !studySamples && <Spin spinning={true}/> }
                </Space>
            }
        </>
    )
}

export default StudyDetails