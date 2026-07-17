import React, { useEffect } from 'react'
import { useState } from 'react'
import { Library } from '../../models/frontend_models'
import { Table,Spin } from 'antd'
import { ProjectOverviewExportButtonData} from './types'
import api from '../../utils/api'
import { useAppDispatch } from '../../hooks'
import { useCreateCsvExportFunction } from './useCsvExport'
import ProjectOverviewExportButton from './ProjectOverviewExportButton'

import {LIBRARY_COLUMN_DEFINITIONS,ObjectWithLibrary,} from "../libraries/LibraryTableColumns";
import ExternalIDLibraryDashboard from './ExternalIDLibraryDashboard'

interface ProjectLibrariesTabProps {
	externalID: string
	hasSearched: boolean
	isActive: boolean
}


const projectOverviewLibraryColumns = [
  LIBRARY_COLUMN_DEFINITIONS.ID,
  LIBRARY_COLUMN_DEFINITIONS.PLATFORM_NAME,
  LIBRARY_COLUMN_DEFINITIONS.PROJECT_NAME,
  LIBRARY_COLUMN_DEFINITIONS.NAME,
  LIBRARY_COLUMN_DEFINITIONS.CONTAINER_BARCODE,
  LIBRARY_COLUMN_DEFINITIONS.COORDINATES,
  LIBRARY_COLUMN_DEFINITIONS.LIBRARY_TYPE,
  LIBRARY_COLUMN_DEFINITIONS.SELECTION_TARGET,
  LIBRARY_COLUMN_DEFINITIONS.INDEX_NAME,
  LIBRARY_COLUMN_DEFINITIONS.VOLUME,
  LIBRARY_COLUMN_DEFINITIONS.LIBRARY_SIZE,
  LIBRARY_COLUMN_DEFINITIONS.CONCENTRATION_NM,
  LIBRARY_COLUMN_DEFINITIONS.CONCENTRATION,
  LIBRARY_COLUMN_DEFINITIONS.NA_QUANTITY,
  LIBRARY_COLUMN_DEFINITIONS.QC_FLAG,
  LIBRARY_COLUMN_DEFINITIONS.CREATION_DATE,
  LIBRARY_COLUMN_DEFINITIONS.DEPLETED,
];



function ProjectLibrariesTab ({ externalID, hasSearched, isActive }: ProjectLibrariesTabProps){
	const [projectOverviewLibraries, setProjectOverviewLibraries] = useState<Library[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const dispatch = useAppDispatch()

	useEffect(() => {
		async function fetchLibraries() {
			try {
				setIsLoading(true)
				setError(null)

				const response = await dispatch(
					api.projectOverview.libraries({
						external_id: externalID,
						limit: 100,
					}),
				)
				setProjectOverviewLibraries(response.data.results)
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to fetch libraries')
			} finally {
				setIsLoading(false)
			}
		}

		if (isActive && hasSearched) {
			fetchLibraries()
		}
	}, [externalID, hasSearched, isActive, dispatch])



	const exportableLibraries: Record<string, unknown>[] = projectOverviewLibraries.map((library) => ({
		id: library.id,
		biosample_id: library.biosample_id,
		name: library.name,
		volume: library.volume,
		depleted: library.depleted,
		concentration: library.concentration,
		concentration_nm: library.concentration_nm,
		quantity_ng: library.quantity_ng,
		container: library.container,
		coordinate: library.coordinate,
		is_pool: library.is_pool,
		project: library.project,
		creation_date: library.creation_date,
		quality_flag: library.quality_flag,
		quantity_flag: library.quantity_flag,
		identity_flag: library.identity_flag,
		library_type: library.library_type,
		platform: library.platform,
		library_size: library.library_size,
		index: library.index,
		library_selection: library.library_selection,
		library_selection_target: library.library_selection_target,
		derived_samples_count: library.derived_samples_count,
}));



	const generateCsvContent = useCreateCsvExportFunction(exportableLibraries)

	if (isLoading) {
		return <Spin />
	}

	if (error) {
		return <div>Error: {error}</div>
	}

	const exportButtonData: ProjectOverviewExportButtonData = {
			exportType: 'Project Libraries',
			exportFunction: generateCsvContent,
			filename: 'Project Libraries',
			itemsCount: projectOverviewLibraries.length,
			disabled: projectOverviewLibraries.length === 0,
		}
	
const tableData: ObjectWithLibrary[] = projectOverviewLibraries.map((library) => ({
  library,
}));

	return(
	<>
			{!isLoading && projectOverviewLibraries.length > 0 && (
				<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
					<ProjectOverviewExportButton data={exportButtonData} />
				</div>
			)}
			{!isLoading && hasSearched && isActive && <ExternalIDLibraryDashboard libraries={projectOverviewLibraries} />}

			{projectOverviewLibraries.length > 0 ? (
				<Table
					dataSource={tableData}
					columns={projectOverviewLibraryColumns}
					rowKey={(record) => record.library?.id ?? ''}
					size="small"
					bordered
					scroll={{ x: 'max-content'}}
					pagination={{
						pageSize: 15,
						showSizeChanger: true,
					}}
				/>
			) : (
				<div>No libraries found for External ID: {externalID}</div>
			)}
		</>
		)
}

export default ProjectLibrariesTab
