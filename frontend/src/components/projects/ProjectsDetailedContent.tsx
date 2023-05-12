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

const { TabPane } = Tabs

const ProjectsDetailedContentRoute = () => {
	const projectID = useIDParam('id')
	const dispatch = useAppDispatch()
	const projectsByID = useAppSelector(selectProjectsByID)
	const studiesByID = useAppSelector(selectStudiesByID)

	const [project, setProject] = useState<Project>()
	const studies = project ? getAllItems(studiesByID).filter(study => study.project_id === project.id) : []

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
	const dispatch = useAppDispatch()

	const navigate = useNavigate()

	const [activeKey, setActiveKey] = useHashURL('overview')

	const currentStudy = activeKey.startsWith("study") ? Number(activeKey.split("-")[1]) : null

	const tabsStyle = {
		marginTop: 8,
	}

	const tabStyle: React.CSSProperties = {
		padding: '0 24px 24px 24px',
		overflow: 'auto',
		height: '100%',
	}

	const title = `Project ${project ? project.name : ''}`

	const handleRemoveStudy = useCallback(async () => {
		if (currentStudy !== null) {
			await dispatch(removeStudy(currentStudy))
			setActiveKey('overview')
		}
	}, [currentStudy, dispatch, setActiveKey])

	const handleAddStudy = useCallback(() => {
		navigate(`/projects/${`${project.id}`}/study/add`)
	}, [project, navigate])

	// Clicking the Add Study button navigates the user to the study creation form
	const addStudyButton = <Button onClick={handleAddStudy} >Add Study</Button>

	const removeStudyButton = <Button onClick={handleRemoveStudy} disabled={!studies.some((study) => study.id === currentStudy && study.removable)}>Remove Study</Button>

	return (
		<>
			<AppPageHeader title={title} extra={<EditButton url={`/projects/${`${project.id}`}/update`} />} />

			{project && (
				<PageContent loading={false} style={undefined}>
					{ project && 
						<Tabs activeKey={activeKey} onChange={setActiveKey} size="large" type="card" style={tabsStyle} tabBarExtraContent={<>{addStudyButton}{removeStudyButton}</>}>
							<TabPane tab="Overview" key="overview" style={tabStyle}>
								<ProjectOverview project={project} />
							</TabPane>
							<TabPane tab="Associated Samples" key="samples" style={tabStyle}>
								<ProjectsAssociatedSamples projectID={project.id} />
							</TabPane>	
							{studies.map(study => {
								return (
									<TabPane tab={`Study ${study.letter}`} key={createStudyTabKey(study.id)} style={tabStyle}>
										<StudyDetails studyId={study.id}/>
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
