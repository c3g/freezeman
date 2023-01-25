import { Descriptions, Space, Switch, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { Project, Study, Workflow } from '../../models/frontend_models'
import { StudySampleList } from '../../models/study_samples'
import { get as getProject } from '../../modules/projects/actions'
import { get as getStudy } from '../../modules/studies/actions'
import { flushStudySamples, getStudySamples } from '../../modules/studySamples/actions'
import { get as getWorkflow } from '../../modules/workflows/actions'
import { selectProjectsByID, selectStudiesByID, selectStudySamples, selectWorkflowsByID } from '../../selectors'
import StudySamples from '../studySamples/StudySamples'

const { Title, Text } = Typography

interface StudyDetailsProps {
    studyId: number
}

const StudyDetails = ({studyId} : StudyDetailsProps) => {
    const dispatch = useAppDispatch()
    const projectsById = useAppSelector(selectProjectsByID)
    const studiesById = useAppSelector(selectStudiesByID)
    const workflowsById = useAppSelector(selectWorkflowsByID)
    const studySamplesState = useAppSelector(selectStudySamples)

    const [study, setStudy] = useState<Study>()
    const [workflow, setWorkflow] = useState<Workflow>()
    const [project, setProject] = useState<Project>()

    const [studySamples, setStudySamples] = useState<StudySampleList>()

    const [hideEmpty, setHideEmpty] = useState(false)

    useEffect(() => {
        if (!studyId) {
            return
        }
        const studyInstance = studiesById[studyId]
        if (studyInstance) {
            setStudy(studyInstance)

            const projectInstance = projectsById[studyInstance.project_id]
            if (projectInstance) {
                setProject(projectInstance)
            } else {
                dispatch(getProject(studyInstance.project_id))
            }

            const workflowInstance = workflowsById[studyInstance.workflow_id]
            if(workflowInstance) {
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
                if (studyState.isFetching) {
                    return
                } else {
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

    return (
        <>
            <Title level={4}>{`Study ${study?.letter ?? ''}`}</Title>
            <Descriptions bordered={true} size="small" column={4}>
                <Descriptions.Item label="Project" span={2}>{project?.name ?? ''}</Descriptions.Item>
                <Descriptions.Item label="Workflow" span={2}>{workflow?.name ?? ''}</Descriptions.Item>
            </Descriptions>
            
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingRight: '0.5rem'}}>
                <Title level={4} style={{marginTop: '1rem'}}>Samples</Title>
                <Space>
                    <Text>Hide empty steps</Text>
                    <Switch checked={hideEmpty} onChange={setHideEmpty}></Switch>
                </Space>
            </div>
            
            { studySamples && 
                <StudySamples studySamples={studySamples} hideEmptySteps={hideEmpty}/>
            }
        </>
        
    )
}

export default StudyDetails