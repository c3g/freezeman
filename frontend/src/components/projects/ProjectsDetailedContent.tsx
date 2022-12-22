import { Button, Tabs, Typography } from 'antd'
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import useHashURL from '../../hooks/useHashURL'
import { Project } from '../../models/frontend_models'
const { Title } = Typography

import { get } from '../../modules/projects/actions'
import AppPageHeader from '../AppPageHeader'
import EditButton from '../EditButton'
import PageContent from '../PageContent'
import CreateStudy from './CreateStudy'
import ProjectOverview from './ProjectOverview'
import ProjectsAssociatedSamples from './ProjectsAssociatedSamples'

const { TabPane } = Tabs

interface ProjectsDetailedContentProps {
	// No properties yet
}

const ProjectsDetailedContent = ({}: ProjectsDetailedContentProps) => {
	const navigate = useNavigate()
	const { id } = useParams()
	const dispatch = useDispatch()

	const projectsByID = useSelector((state: any) => state.projects.itemsByID)

	const [activeKey, setActiveKey] = useHashURL('overview')

	let isLoading = true
	let project : Project | undefined = undefined
	if (id) {
		project = projectsByID[id]
		if (project) {
			isLoading = false
		} else {
			dispatch(get(id))
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
							{/* TODO Add a tab for each study in the project */}
						</Tabs>
					}
				</PageContent>
			)}
		</>
	)
}

export default ProjectsDetailedContent
