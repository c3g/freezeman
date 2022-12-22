import React from 'react'
import { useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { selectProjectsByID } from '../../selectors'
import StudyEditForm from './StudyEditForm'
import { Typography } from 'antd'
import {fakeWorkflows} from './FakeWorkflows'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import { Project } from '../../models/frontend_models'

const { Title } = Typography

interface EditStudyContentProps {
   action: 'ADD' | 'EDIT'
}

const StudyEditContent = ({action} : EditStudyContentProps) => {

    let project: Project | undefined = undefined
    let study: any

    const projectId = useParams().id
    if (!!projectId) {
        const projectsById = useSelector(selectProjectsByID)
        project = projectsById[projectId]
    }


    const studyId = useParams().study_id
    if (!!studyId) {
        // TODO get study from redux
    }

    let title : string
    if (action === 'ADD') {
        title = 'Create a Study'
    } else {
        title = `Edit ${"a Study"}`  // TODO: display study name
    }

    return (
        <>
            <AppPageHeader title={title}/>
            <PageContent>
                {project && 
                    <StudyEditForm project={project} workflows={fakeWorkflows}/>
                }
            </PageContent>
            
        </>
        
    )
}

export default StudyEditContent