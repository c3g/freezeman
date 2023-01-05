import React, { useEffect, useState } from 'react'
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
import { withProject } from '../../utils/withItem'

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
    const [project, setProject] = useState<Project>()
    let study: any

    const isCreating = action === 'ADD'

    let dispatch = useAppDispatch()
    let projectsById = useSelector(selectProjectsByID)
    let projectId = useParams().id

    useEffect(() => {
        if (projectId) {
            const myProject = projectsById[projectId]
            if (myProject) {
                setProject(myProject)
            } else {
                withProject(projectsById, projectId, (project) => project)
            }
        }
    }, [projectId, projectsById])


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

    async function handleFormSubmit(referenceGenome?: ReferenceGenome, workflow?: Workflow, stepRange?: {start?: number, end?: number}) {
        if (isCreating) {
            if (project && workflow) {
                dispatch(add({
                    project,
                    workflow,
                    referenceGenome,
                    stepRange
                })).catch(err => {
                    // TODO Move error handling code in to the form, since the error message will
                    // contain an error and the name of the field that contained the error, so that
                    // we can display the error message beside the form input containing the bad data.
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