import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { selectProjectsByID, selectWorkflowsByID } from '../../selectors'
import StudyEditForm from './StudyEditForm'
import { Alert, Space, Typography } from 'antd'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import { Project, ReferenceGenome, Workflow } from '../../models/frontend_models'
import { useAppDispatch } from '../../hooks'
import { add } from '../../modules/studies/actions'

const { Title } = Typography

interface EditStudyContentProps {
   action: 'ADD' | 'EDIT'
}

interface AlertError {
    message: string
    description: string
}

const StudyEditContent = ({action} : EditStudyContentProps) => {

    const [alertError, setAlertError] = useState<AlertError>()

    let project: Project | undefined = undefined
    let study: any

    const isCreating = action === 'ADD'

    let dispatch = useAppDispatch()

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

    async function handleFormSubmit(referenceGenome?: ReferenceGenome, workflow?: Workflow) {
        if (isCreating) {
            if (project && workflow) {
                dispatch(add({
                    project,
                    workflow,
                    referenceGenome
                })).catch(err => {
                    // TODO 
                    setAlertError({
                        message: 'An error occured while creating the study.',
                        description: err.message
                    })
                }) 
            }
        } else {
            // TODO handle study update
        }
    }

    return (
        <>
            <AppPageHeader title={title}/>
            <PageContent>
                {alertError && 
                    <div style={{margin: '1rem 1rem 2rem 1rem'}}>
                        <Alert type='error' message={alertError.message} description={alertError.description} closable onClose={() => setAlertError(undefined)}/>
                    </div>
                }
                {project && 
                    <StudyEditForm project={project} workflows={workflows} isCreatingStudy={isCreating} onSubmit={handleFormSubmit}/>
                }                
            </PageContent>
            
        </>
        
    )
}

export default StudyEditContent