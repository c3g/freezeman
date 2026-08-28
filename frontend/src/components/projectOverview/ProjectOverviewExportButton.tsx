import React from 'react'
import ExportButton from '../ExportButton'
import { ProjectOverviewExportButtonData } from './types'

interface ProjectOverviewExportButtonProps {
	data: ProjectOverviewExportButtonData
}

const ProjectOverviewExportButton = ({ data }: ProjectOverviewExportButtonProps) => {
	return (
		<ExportButton
			exportType={data.exportType}
			exportFunction={data.exportFunction}
			filename={data.filename}
			itemsCount={data.itemsCount}
			disabled={data.disabled}
		/>
	)
}

export default ProjectOverviewExportButton
