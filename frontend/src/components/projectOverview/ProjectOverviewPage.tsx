import { Input, Tabs, Typography } from 'antd'
import FlexBar from '../shared/Flexbar'

import React, { useEffect, useMemo } from 'react'

import useHashURL from '../../hooks/useHashURL'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'

import ProjectSubmissionsTab from './ProjectSubmissionsTab'
import ProjectSamplesTab from './ProjectSamplesTab'
import ProjectLibrariesTab from './ProjectLibrariesTab'
import ProjectReadSetsTab from './ProjectReadSetsTab'

import { useAppSelector } from '../../hooks'
import ProjectsTableActions from '../../modules/projectsTable/actions'
import { selectProjectsByID, selectProjectsTable } from '../../selectors'
import { usePagedItemsActionsCallbacks } from '../pagedItemsTable/usePagedItemsActionCallbacks'
import { PROJECT_FILTERS, PROJECT_FILTER_KEYS, ProjectColumnID } from '../projects/ProjectsTableColumns'

import { useParams } from 'react-router-dom'

/*
ProjectOverview fetch tous les projets a partir du stotre Redux , puis applique le filtre External ID pour 
correspondre au External ID que lutilisateur saisie.
Then, il en extrait les ids de projets (soumissions) Freezeman correspondant. 
Et ce sont ces id de soumissions freezeman qui sont passees aux enfant , 
Eux qui les utilise,pour fetcher duatres informations selon leurs besoins et transmettent les infos fecther a leurs afficheurs pour affichage

*/

const ProjectOverviewPage = () => {
	const { externalID } = useParams()
	const selectedExternalID = externalID || ''

	const [activeKey, setActiveKey] = useHashURL('submissions')

	const projectsTableState = useAppSelector(selectProjectsTable)
	const projectsByID = useAppSelector(selectProjectsByID)
	const projectsTableCallbacks = usePagedItemsActionsCallbacks(ProjectsTableActions)

	const externalIDFilter = useMemo(
		() => ({
			...PROJECT_FILTERS[ProjectColumnID.EXTERNAL_ID],
			key: PROJECT_FILTER_KEYS[ProjectColumnID.EXTERNAL_ID],
		}),
		[],
	)

	useEffect(() => {
		async function applyExternalIDFilter() {
			await projectsTableCallbacks.resetPagedItemsCallback()

			if (!selectedExternalID) {
				return
			}

			await projectsTableCallbacks.setFilterCallback(selectedExternalID, externalIDFilter)
		}

		applyExternalIDFilter()
	}, [selectedExternalID, externalIDFilter, projectsTableCallbacks])

	const hasSearched = Boolean(selectedExternalID)
	const searchedExternalID = selectedExternalID

	const projectIds = projectsTableState.items
	const selectedProjects = projectIds.map((projectId) => projectsByID[projectId]).filter(Boolean)

	const herculesProjectName = selectedProjects[0]?.external_name || ''

	return (
		<>
			<AppPageHeader title={!externalID ? 'Project Overview' : `Project Overview : (External ID ${externalID})`} />

			<PageContent tabs>
				<FlexBar style={{ alignItems: 'center', justifyContent: 'flex-start', gap: 8, marginBottom: 16 }}>
					<Typography.Text strong style={{ fontSize: 18 }}>{herculesProjectName}</Typography.Text>
					<span>{!hasSearched && '(Ex : P000123)'}</span>
				</FlexBar>

				<Tabs
					activeKey={activeKey}
					onChange={setActiveKey}
					size="large"
					type="card"
					items={[
						{
							label: 'Associated Freezeman Projects',
							key: 'submissions',
							children: (
								<ProjectSubmissionsTab
									projectIds={projectIds}
									hasSearched={hasSearched}
									searchedExternalID={searchedExternalID}
								/>
							),
						},
						{
							label: 'Samples',
							key: 'samples',
							children: (
								<ProjectSamplesTab projectIds={projectIds} hasSearched={hasSearched} isActive={activeKey === 'samples'} />
							),
						},
						{
							label: 'Libraries',
							key: 'libraries',
							children: (
								<ProjectLibrariesTab
									projectIds={projectIds}
									hasSearched={hasSearched}
									isActive={activeKey === 'libraries'}
								/>
							),
						},
						{
							label: 'Read Sets',
							key: 'readsets',
							children: (
								<ProjectReadSetsTab
									externalID={searchedExternalID}
									hasSearched={hasSearched}
									isActive={activeKey === 'readsets'}
								/>
							),
						},
					]}
				/>
			</PageContent>
		</>
	)
}

export default ProjectOverviewPage
