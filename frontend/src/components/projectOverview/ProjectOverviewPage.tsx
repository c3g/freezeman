import { Empty, Select, Spin, Tabs, Typography } from 'antd'
import React, { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAppDispatch, useAppSelector } from '../../hooks'
import useHashURL from '../../hooks/useHashURL'
import { useIDParam } from '../../hooks/useIDParams'
import { FMSId } from '../../models/fms_api_models'
import { getAllItems } from '../../models/frontend_models'
import { get as getProject } from '../../modules/projects/actions'
import { selectProjectsByID } from '../../selectors'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import FlexBar from '../shared/Flexbar'
import ProjectOverview from '../projects/ProjectOverview'
import ProjectAnalysisTab from './ProjectAnalysisTab'
import ProjectDocumentsTab from './ProjectDocumentsTab'
import ProjectLibrariesTab from './ProjectLibrariesTab'
import ProjectReadSetsTab from './ProjectReadSetsTab'
import ProjectSamplesTab from './ProjectSamplesTab'

import { list as listProjects } from '../../modules/projects/actions'
import ProjectOverviewSearch from './ProjectOverviewSearch'

const ProjectOverviewPage = () => {
	const navigate = useNavigate()
	const dispatch = useAppDispatch()

	const projectID = useIDParam('id')
	const projectsByID = useAppSelector(selectProjectsByID)
	const project = projectID ? projectsByID[projectID] : undefined

	const [activeKey, setActiveKey] = useHashURL('details')

	useEffect(() => {
		if (projectID && !project) {
			dispatch(getProject(projectID))
		}
	}, [projectID, project, dispatch])

	if (!projectID) {
		return <ProjectOverviewSearch />
	}

	return (
		<>
			<AppPageHeader title={project ? `Project Data : ${project.name}` : 'Project Data'} />

			<PageContent tabs={Boolean(project)}>
				{!projectID && <Empty description="Select a project to view project data" />}

				{projectID && !project && <Spin />}

				{project && (
					<Tabs
						activeKey={activeKey}
						onChange={setActiveKey}
						size="large"
						type="card"
						items={[
							{
								label: 'Project Details',
								key: 'details',
								children: <ProjectOverview project={project} />,
							},
							{
								label: 'Samples',
								key: 'samples',
								children: <ProjectSamplesTab projectID={project.id} />,
							},
							{
								label: 'Libraries',
								key: 'libraries',
								children: <ProjectLibrariesTab projectID={project.id} />,
							},
							{
								label: 'NextSeq Read Sets',
								key: 'readsets',
								children: <ProjectReadSetsTab projectID={project.id} />,
							},
							{
								label: 'Analysis',
								key: 'analysis',
								children: <ProjectAnalysisTab projectID={project.id} />,
							},
							{
								label: 'Documents',
								key: 'documents',
								children: <ProjectDocumentsTab projectID={project.id} />,
							},
						]}
					/>
				)}
			</PageContent>
		</>
	)
}

export default ProjectOverviewPage
