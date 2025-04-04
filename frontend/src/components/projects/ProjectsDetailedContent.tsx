import { Button, Tabs } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks'
import useHashURL from '../../hooks/useHashURL'
import { getAllItems, Project, Study } from '../../models/frontend_models'

import { useIDParam } from '../../hooks/useIDParams'
import { listProjectStudies, remove as removeStudy } from '../../modules/studies/actions'
import { selectProjectsByID, selectStudiesByID } from '../../selectors'
import AppPageHeader from '../AppPageHeader'
import EditButton from '../EditButton'
import PageContent from '../PageContent'
import StudyDetails from '../studies/StudyDetails'
import { createStudyTabKey } from '../studies/StudyEditContent'
import ProjectOverview from './ProjectOverview'
import ProjectsAssociatedSamples from './ProjectsAssociatedSamples'
import { get as getProject } from '../../modules/projects/actions'
import { FMSId } from '../../models/fms_api_models'
import { SampleColumnID } from '../samples/SampleTableColumns'

const { TabPane } = Tabs

const ProjectsDetailedContentRoute = () => {
	const projectID = useIDParam('id')
	const dispatch = useAppDispatch()
	const projectsByID = useAppSelector(selectProjectsByID)
	const studiesByID = useAppSelector(selectStudiesByID)

	const [project, setProject] = useState<Project>()
	const studies = project
		? getAllItems(studiesByID)
			.filter(study => study.project_id === project.id)
			.sort((a, b) => {
				if (a.letter > b.letter) return 1
				else if (a.letter < b.letter) return -1
				else return 0
			})
		: []

	useEffect(() => {
		if (projectID) {
			const foundProject = projectsByID[projectID]
			if (foundProject) {
				setProject(foundProject)
			} else {
				dispatch(getProject(projectID))
			}
		}
	}, [projectID, projectsByID, dispatch])

	useEffect(() => {
		if (project) {
			dispatch(listProjectStudies(project.id))
		}
	}, [project, dispatch])


	return project && <ProjectsDetailedContent project={project} studies={studies}/>
}

interface ProjectsDetailedContentProps {
	project: Project
	studies: Study[]
}

const ProjectsDetailedContent = ({project, studies} : ProjectsDetailedContentProps) => {
	const navigate = useNavigate()
	const dispatch = useAppDispatch()

	const [activeKey, setActiveKey] = useHashURL('overview')

	const tabStyle: React.CSSProperties = {
		padding: '0 24px 24px 24px',
		overflow: 'auto',
		height: '100%',
	}

	const title = `Project ${project ? project.name : ''}`

	const handleAddStudy = useCallback(() => {
		navigate(`/projects/${`${project.id}`}/study/add`)
	}, [project, navigate])

	const handleRemoveStudy = useCallback((studyId: FMSId) => {
		(async () => {
			await dispatch(removeStudy(studyId))
			setActiveKey('overview')
		})()
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dispatch, setActiveKey, studies])

	// Clicking the Add Study button navigates the user to the study creation form
	const addStudyButton = <Button onClick={handleAddStudy}>Add Study</Button>

	return (
		<>
			<AppPageHeader title={title} extra={<>
				<Button onClick={() => navigate(`/management/workflow-assignment?${SampleColumnID.PROJECT}=${project.name}`)}>Manage Workflow</Button>
				<EditButton url={`/projects/${`${project.id}`}/update`} />
				</>}/>
			{project && (
				<PageContent loading={false} style={undefined}>
					{ project && 
						<Tabs activeKey={activeKey} onChange={setActiveKey} size="large" type="card" tabBarExtraContent={addStudyButton}>
							<TabPane tab="Overview" key="overview" style={tabStyle}>
								<ProjectOverview project={project} />
							</TabPane>
							<TabPane tab="Associated Samples" key="samples" style={tabStyle}>
								<ProjectsAssociatedSamples projectID={project.id} />
							</TabPane>	
							{studies.map(study => {
								return (
									<TabPane tab={`Study ${study.letter}`} key={createStudyTabKey(study.id)} style={tabStyle}>
										<StudyDetails studyId={study.id} handleRemoveStudy={handleRemoveStudy}/>
									</TabPane>
								)
							})}
						</Tabs>
					}
				</PageContent>
			)}
		</>
	)
}

export default ProjectsDetailedContentRoute
