import React from 'react'
import ExportButton from '../ExportButton'

interface ProjectOverviewExportButtonProps {
	exportType: string
	exportFunction: () => Promise<string>
	filename: string
	itemsCount: number
	disabled: boolean
}

const ProjectOverviewExportButton = () => {
	return <></>
}

export default ProjectOverviewExportButton
