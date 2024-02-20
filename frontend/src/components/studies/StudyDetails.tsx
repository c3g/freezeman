import { Button, Descriptions, Popconfirm, Space, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { Study, Workflow } from '../../models/frontend_models'
import { get as getStudy } from '../../modules/studies/actions'
import { get as getWorkflow } from '../../modules/workflows/actions'
import { selectProjectsByID, selectStudiesByID, selectWorkflowsByID } from '../../selectors'
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

    const [study, setStudy] = useState<Study>()
    const [workflow, setWorkflow] = useState<Workflow>()

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
    }, [studyId, studiesById, workflowsById, projectsById, study, workflow, dispatch])

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
            <FlexBar>
                <Title level={4}>{`Study ${study?.letter ?? ''}`}</Title>
                <Space>
                    {!study?.removable && <Typography.Text italic style={{color: 'gray'}}>&#9432; Studies that contain samples or that have been initiated cannot be removed.</Typography.Text>}
                    <Popconfirm
                        title={`Are you sure you want to remove study ${study?.letter}? This removal cannot be undone.`}
                        onConfirm={() => handleRemoveStudy(studyId)}
                        disabled={!study?.removable}
                        placement={'bottomLeft'}
                    >
                        <Button disabled={!study?.removable}>Remove Study {study?.letter ?? ''}</Button>
                    </Popconfirm>
                </Space>
            </FlexBar>
            <Descriptions bordered={true} size="small" column={4}>
                <Descriptions.Item label="Workflow" span={4}>{workflow?.name ?? ''}</Descriptions.Item>
                <Descriptions.Item label="Start Step" span={2}>{getStepWithOrder(study?.start)}</Descriptions.Item>
                <Descriptions.Item label="End Step" span={2}>{getStepWithOrder(study?.end)}</Descriptions.Item>
                <Descriptions.Item label="Description" span={4}>{
                    <div style={{ overflowY: 'auto', maxHeight: '9.5em' }}>
                        {study?.description?.split("\n")?.map((line, key) => <div key={key}>{line}</div>)}
                    </div>
                }</Descriptions.Item>
            </Descriptions>
            { study && <StudySamples studyID={study.id} /> }
        </>
    )
}

export default StudyDetails
