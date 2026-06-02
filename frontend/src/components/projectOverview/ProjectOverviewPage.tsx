import { Input, Tabs, Typography } from 'antd'
import FlexBar from '../shared/Flexbar'

import React, { useCallback, useMemo, useState } from 'react'

import useHashURL from '../../hooks/useHashURL'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'

import ProjectSubmissionsTab from './ProjectSubmissionsTab'
import ProjectSamplesTab from './ProjectSamplesTab'
import ProjectLibrariesTab from './ProjectLibrariesTab'
import ProjectReadSetsTab from './ProjectReadSetsTab'
import ProjectAnalysisTab from './ProjectAnalysisTab'
import ProjectDocumentsTab from './ProjectDocumentsTab'

import { useAppSelector } from '../../hooks'
import ProjectsTableActions from '../../modules/projectsTable/actions'
import { selectProjectsTable } from '../../selectors'
import { usePagedItemsActionsCallbacks } from '../pagedItemsTable/usePagedItemsActionCallbacks'
import { PROJECT_FILTERS, PROJECT_FILTER_KEYS, ProjectColumnID } from '../projects/ProjectsTableColumns'

/*
ProjectOverview fetch tous les projets a partir du stotre Redux , puis applique le filtre External ID pour 
correspondre au External ID que lutilisateur saisie.
Then, il en extrait les ids de projets (soumissions) Freezeman correspondant. 
Et ce sont ces id de soumissions freezeman qui sont passees aux enfant , 
Eux qui les utilise,pour fetcher duatres informations selon leurs besoins et transmettent les infos fecther a leurs afficheurs pour affichage

*/

const ProjectOverviewPage = () => {
	const [activeKey, setActiveKey] = useHashURL('submissions')
	const [externalID, setExternalID] = useState('')
	const [searchedExternalID, setSearchedExternalID] = useState('')
	const [hasSearched, setHasSearched] = useState(false)

	const projectsTableState = useAppSelector(selectProjectsTable)
	const projectsTableCallbacks = usePagedItemsActionsCallbacks(ProjectsTableActions)

	const externalIDFilter = useMemo(
		() => ({
			...PROJECT_FILTERS[ProjectColumnID.EXTERNAL_ID],
			key: PROJECT_FILTER_KEYS[ProjectColumnID.EXTERNAL_ID],
		}),
		[],
	)

	const handleSearch = useCallback(
		async (value: string) => {
			const trimmedValue = value.trim()

			setExternalID(trimmedValue)
			setSearchedExternalID(trimmedValue)
			setHasSearched(Boolean(trimmedValue))
			setActiveKey('submissions')

			await projectsTableCallbacks.resetPagedItemsCallback()

			if (!trimmedValue) {
				return
			}

			await projectsTableCallbacks.setFilterCallback(trimmedValue, externalIDFilter)
		},
		[projectsTableCallbacks, externalIDFilter, setActiveKey],
	)

	const projectIds = projectsTableState.items

	return (
		<>
			<AppPageHeader title={!externalID ? 'Project Overview' : `Project Overview : (External ID ${externalID})`} />

			<PageContent tabs>
				<FlexBar style={{ alignItems: 'center', justifyContent: 'flex-start', gap: 8, marginBottom: 16 }}>
					<Typography.Text strong>Project External ID</Typography.Text>
					<Input.Search
						allowClear
						enterButton="Search"
						placeholder="Enter a project external ID"
						value={externalID}
						onChange={(event) => setExternalID(event.target.value)}
						onSearch={handleSearch}
						style={{ maxWidth: 420 }}
					/>
					<span>{!hasSearched && '(Ex : P000123)'}</span>
				</FlexBar>

				<Tabs
					activeKey={activeKey}
					onChange={setActiveKey}
					size="large"
					type="card"
					items={[
						{
							label: 'Project Submissions',
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
								<ProjectReadSetsTab projectIds={projectIds} hasSearched={hasSearched} isActive={activeKey === 'readsets'} />
							),
						},
						{
							label: 'Analysis',
							key: 'analysis',
							children: (
								<ProjectAnalysisTab projectIds={projectIds} hasSearched={hasSearched} isActive={activeKey === 'analysis'} />
							),
						},
						{
							label: 'Documents',
							key: 'documents',

							children: (
								<ProjectDocumentsTab
									projectIds={projectIds}
									hasSearched={hasSearched}
									isActive={activeKey === 'documents'}
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
