import { Alert, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { useAppDispatch } from '../../hooks'
import { ApiError, isApiError } from '../../models/fms_api_models'
import { Project, ReferenceGenome, Workflow, WorkflowStepRange } from '../../models/frontend_models'
import { add } from '../../modules/studies/actions'
import { selectProjectsByID, selectWorkflowsByID } from '../../selectors'
import { withProject } from '../../utils/withItem'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import StudyEditForm from './StudyEditForm'

const { Title } = Typography

interface EditStudyContentProps {
	action: 'ADD' | 'EDIT'
}

interface AlertError {
	message: string
	description: string
}

const StudyEditContent = ({ action }: EditStudyContentProps) => {
	const [alertError, setAlertError] = useState<AlertError>()
	const [apiError, setApiError] = useState<ApiError>()
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

	let title: string
	if (isCreating) {
		title = 'Create a Study'
	} else {
		title = `Edit ${'a Study'}` // TODO: display study name
	}

	async function handleFormSubmit(referenceGenome?: ReferenceGenome, workflow?: Workflow, stepRange?: WorkflowStepRange) {
		if (isCreating) {
			if (project && workflow && stepRange) {
				const result = await dispatch(
					add({
						project,
						workflow,
						referenceGenome,
						stepRange,
					})
				).then(() => {
					setApiError(undefined)
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
