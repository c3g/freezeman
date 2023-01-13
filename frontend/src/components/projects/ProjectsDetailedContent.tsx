import { Button, Tabs } from 'antd'
import React, { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks'
import useHashURL from '../../hooks/useHashURL'
import { Project, Study } from '../../models/frontend_models'

import { get } from '../../modules/projects/actions'
import { listProjectStudies } from '../../modules/studies/actions'
import { selectProjectsByID, selectStudiesByID } from '../../selectors'
import AppPageHeader from '../AppPageHeader'
import EditButton from '../EditButton'
import PageContent from '../PageContent'
import StudyDetails from '../studies/StudyDetails'
import ProjectOverview from './ProjectOverview'
import ProjectsAssociatedSamples from './ProjectsAssociatedSamples'
import { createStudyTabKey} from '../studies/StudyEditContent'

const { TabPane } = Tabs

interface ProjectsDetailedContentProps {
	// No properties yet
}

const ProjectsDetailedContent = ({}: ProjectsDetailedContentProps) => {
	const navigate = useNavigate()
	const { id } = useParams()
	const dispatch = useAppDispatch()

	const projectID = id ? Number.parseInt(id) : undefined
	const projectsByID = useSelector(selectProjectsByID)
	const studiesById = useAppSelector(selectStudiesByID)

	const [activeKey, setActiveKey] = useHashURL('overview')

	let isLoading = true
	let project : Project | undefined = undefined
	if (projectID) {
		project = projectsByID[projectID]
		if (project) {
			isLoading = false
		} else {
			dispatch(get(id))	// TODO - USEEFFECT
		}
	}

	useEffect(() => {
		if (projectID) {
			dispatch(listProjectStudies(projectID))
		}
	}, [id])

	// Get the studies owned by this project
	// const studies = Object.values(studiesById).filter(study => study.project_id === id)
	const studies: Study[] = []
	for(const key in studiesById) {
		const study = studiesById[key]
		if (study.project_id === projectID) {
			studies.push(study)
		}
	}

	const tabsStyle = {
		marginTop: 8,
	}

	const tabStyle: React.CSSProperties = {
		padding: '0 24px 24px 24px',
		overflow: 'auto',
		height: '100%',
	}

	const title = `Project ${project?.name}`

	// Clicking the Add Study button navigates the user to the study creation form
	const addStudyButton = <Button onClick={() => {navigate(`/projects/${id}/study/add`)}}>Add Study</Button>

	return (
		<>
			<AppPageHeader title={title} extra={<EditButton url={`/projects/${id}/update`} />} />

			{project && (
				<PageContent loading={isLoading} style={undefined}>
					{ project && 
						<Tabs activeKey={activeKey} onChange={setActiveKey} size="large" type="card" style={tabsStyle} tabBarExtraContent={addStudyButton}>
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

export default ProjectsDetailedContent
