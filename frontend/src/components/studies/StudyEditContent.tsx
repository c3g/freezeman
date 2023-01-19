import { Alert } from 'antd'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppDispatch } from '../../hooks'
import { useIDParam } from '../../hooks/useIDParams'
import { ApiError, FMSStudy, isApiError } from '../../models/fms_api_models'
import { ItemsByID, Project, Study, Workflow, WorkflowStepRange } from '../../models/frontend_models'
import { add } from '../../modules/studies/actions'
import { selectProjectsByID, selectWorkflowsByID } from '../../selectors'
import { withProject } from '../../utils/withItem'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import StudyEditForm from './StudyEditForm'


interface EditStudyContentProps {
	action: 'ADD' | 'EDIT'
}

interface AlertError {
	message: string
	description: string
}

// Generates the string we use as a tab key in the project details page for a study.
export function createStudyTabKey(studyId : number) {
	return `study-${studyId}`
}

const StudyEditContent = ({ action }: EditStudyContentProps) => {
	const navigate = useNavigate()
	let dispatch = useAppDispatch()

	const [alertError, setAlertError] = useState<AlertError>()
	const [apiError, setApiError] = useState<ApiError>()
	const [project, setProject] = useState<Project>()
	let study: Study

	const isCreating = action === 'ADD'
	
	let projectsById : ItemsByID<Project> = useSelector(selectProjectsByID)


	const projectId = useIDParam('id')
	if (!projectId) {
		return null
	}
	
	const studyID = useIDParam('study_id')

	useEffect(() => {
		if (projectId) {
			const myProject = projectsById[projectId]
			if (myProject) {
				setProject(myProject)
			} else {
				withProject(projectsById, `${projectId}`, (project) => project)
			}
		}
	}, [projectId, projectsById])

	

	const workflowsByID = useSelector(selectWorkflowsByID)
	const workflows = Object.values(workflowsByID) as Workflow[]

	let title: string
	if (isCreating) {
		title = 'Create a Study'
	} else {
		title = `Edit ${'a Study'}` // TODO: display study name
	}

	async function handleFormSubmit(workflow?: Workflow, stepRange?: WorkflowStepRange) {
		if (isCreating) {
			if (project && workflow && stepRange) {
				const result = await dispatch(
					add({
						project,
						workflow,
						stepRange
					})
				).then((studyData?: FMSStudy) => {
					setApiError(undefined)
					if (studyData?.id) {
						// Navigate to the study page
						const url = `/projects/${projectId}#${createStudyTabKey(studyData.id)}`
						navigate(url)
					}
				}).catch((err) => {
					if (isApiError(err)) {
						setApiError(err)
					} else {
						setAlertError({
							message: 'An error occured while creating the study.',
							description: err.message ?? 'No error message available.',
						})
					}
				})
				console.log(result)
			}
		} else {
			// TODO handle study update
		}
	}

	return (
		<>
			<AppPageHeader title={title} />
			<PageContent>
				{alertError && (
					<div style={{ margin: '1rem 1rem 2rem 1rem' }}>
						<Alert
							type="error"
							message={alertError.message}
							description={alertError.description}
							closable
							onClose={() => setAlertError(undefined)}
						/>
					</div>
				)}
				{project && (
					<StudyEditForm project={project} workflows={workflows} isCreatingStudy={isCreating} onSubmit={handleFormSubmit} formErrors={apiError?.data}/>
				)}
			</PageContent>
		</>
	)
}

export default StudyEditContent
