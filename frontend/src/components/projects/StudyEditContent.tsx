import React from 'react'
import { useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { selectProjectsByID, selectWorkflowsByID } from '../../selectors'
import StudyEditForm from './StudyEditForm'
import { Typography } from 'antd'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import { Project, ReferenceGenome, Workflow } from '../../models/frontend_models'

const { Title } = Typography

interface EditStudyContentProps {
   action: 'ADD' | 'EDIT'
}

const StudyEditContent = ({action} : EditStudyContentProps) => {

    let project: Project | undefined = undefined
    let study: any

    const isCreating = action === 'ADD'

    const projectId = useParams().id
    if (!!projectId) {
        const projectsById = useSelector(selectProjectsByID)
        project = projectsById[projectId]
    }


    const studyId = useParams().study_id
    if (!!studyId) {
        // TODO get study from redux
    }

    const workflowsByID = useSelector(selectWorkflowsByID)
    const workflows = Object.values(workflowsByID) as Workflow[]

    let title : string
    if (isCreating) {
        title = 'Create a Study'
    } else {
        title = `Edit ${"a Study"}`  // TODO: display study name
    }

    function handleFormSubmit(referenceGenome?: ReferenceGenome, workflow?: Workflow) {
        if (isCreating) {
            // TODO call api to create the study
            console.log(referenceGenome, workflow)
        } else {
            // TODO handle study update
        }
    }

    return (
        <>
            <AppPageHeader title={title}/>
            <PageContent>
                {project && 
                    <StudyEditForm project={project} workflows={workflows} isCreatingStudy={isCreating} onSubmit={handleFormSubmit}/>
                }
            </PageContent>
            
        </>
        
    )
}

export default StudyEditContent