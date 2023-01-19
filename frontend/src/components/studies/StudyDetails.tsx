import { Descriptions, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { Project, Study, Workflow } from '../../models/frontend_models'
import { get as getProject } from '../../modules/projects/actions'
import { get as getStudy } from '../../modules/studies/actions'
import { get as getWorkflow } from '../../modules/workflows/actions'
import { selectProjectsByID, selectStudiesByID, selectWorkflowsByID } from '../../selectors'

const { Title, Text } = Typography

interface StudyDetailsProps {
    studyId: number
}

const StudyDetails = ({studyId} : StudyDetailsProps) => {
    const dispatch = useAppDispatch()
    const projectsById = useAppSelector(selectProjectsByID)
    const studiesById = useAppSelector(selectStudiesByID)
    const workflowsById = useAppSelector(selectWorkflowsByID)

    const [study, setStudy] = useState<Study>()
    const [workflow, setWorkflow] = useState<Workflow>()
    const [project, setProject] = useState<Project>()

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
    }, [studiesById, workflowsById, projectsById])



    return (
        <>
            <Title level={4}>{`Study ${study?.letter ?? ''}`}</Title>
            <Descriptions bordered={true} size="small" column={4}>
                <Descriptions.Item label="Project" span={2}>{project?.name ?? ''}</Descriptions.Item>
                <Descriptions.Item label="Workflow" span={2}>{workflow?.name ?? ''}</Descriptions.Item>
            </Descriptions>
        </>
        
    )
}

export default StudyDetails