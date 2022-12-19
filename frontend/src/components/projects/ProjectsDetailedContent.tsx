import { Tabs, Typography } from 'antd'
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import useHashURL from '../../hooks/useHashURL'
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
	const history = useNavigate()
	const { id } = useParams()
	const dispatch = useDispatch()

	const projectsByID = useSelector((state: any) => state.projects.itemsByID)

	const [activeKey, setActiveKey] = useHashURL('overview')

	let isLoading = true
	let project = {} as any
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

	return (
		<>
			<AppPageHeader title={title} extra={<EditButton url={`/projects/${id}/update`} />} />

			{project && (
				<PageContent loading={isLoading} style={undefined}>
					<Tabs activeKey={activeKey} onChange={setActiveKey} size="large" type="card" style={tabsStyle}>
						<TabPane tab="Overview" key="overview" style={tabStyle}>
							<ProjectOverview project={project} />
						</TabPane>
						<TabPane tab="Associated Samples" key="samples" style={tabStyle}>
							<ProjectsAssociatedSamples projectID={project.id} />
						</TabPane>
						<TabPane tab="+" key="add-study" style={tabStyle}>
							<CreateStudy project={project} />
						</TabPane>
					</Tabs>
				</PageContent>
			)}
		</>
	)
}

export default ProjectsDetailedContent
