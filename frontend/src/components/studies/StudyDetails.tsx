import { Button, Descriptions, Popconfirm, Space, Spin, Typography } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { Study, Workflow } from '../../models/frontend_models'
import { get as getStudy } from '../../modules/studies/actions'
import { flushStudySamples, getStudySamples, refreshStudySamples } from '../../modules/studySamples/actions'
import { StudySampleList } from '../../modules/studySamples/models'
import { get as getWorkflow } from '../../modules/workflows/actions'
import { selectProjectsByID, selectStudiesByID, selectStudySamplesByID, selectWorkflowsByID } from '../../selectors'
import StudySamples from '../studySamples/StudySamples'
import FlexBar from '../shared/Flexbar'
import { FMSId } from '../../models/fms_api_models'

const { Title } = Typography

interface StudyDetailsProps {
    studyId: number
    handleRemoveStudy: (studyId: FMSId) => void
}

const StudyDetails = ({studyId, handleRemoveStudy} : StudyDetailsProps) => {
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
    }, [studyId, studiesById, workflowsById, projectsById, studySamplesState, study, workflow, dispatch])

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
    }, [studyId, studiesById, workflowsById, projectsById, studySamplesState, studySamples, dispatch])

    useEffect(() => {
        return () => {
            dispatch(flushStudySamples(studyId))
        }
    }, [studyId, dispatch])

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
            <FlexBar style={{padding: 0}}>
                <Title level={4}>{`Study ${study?.letter ?? ''}`}</Title>
                <Space>
                    {!study?.removable && <Typography.Text italic style={{color: 'gray'}}>&#9432; Studies containing samples cannot be removed.</Typography.Text>}
                    <Popconfirm
                        title={`Are you sure you want to remove study ${study?.letter}? This removal cannot be undone.`}
                        onConfirm={() => handleRemoveStudy(studyId)}
                        disabled={!study?.removable}
                    >
                        <Button disabled={!study?.removable}>Remove Study {study?.letter ?? ''}</Button>
                    </Popconfirm>
                </Space>
            </FlexBar>
            <Descriptions bordered={true} size="small" column={4}>
                <Descriptions.Item label="Workflow" span={4}>{workflow?.name ?? ''}</Descriptions.Item>
                <Descriptions.Item label="Start Step" span={2}>{getStepWithOrder(study?.start)}</Descriptions.Item>
                <Descriptions.Item label="End Step" span={2}>{getStepWithOrder(study?.end)}</Descriptions.Item>
            </Descriptions>
            { study && studySamples ? 
                <StudySamples studyID={study.id} studySamples={studySamples} refreshSamples={refreshSamples}/>
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