import React from 'react'
import { useState } from 'react'
import { Library } from '../../models/frontend_models'

interface ProjectLibrariesTabProps {
	projectIds: readonly number[]
	hasSearched: boolean
	isActive: boolean
}

const ProjectLibrariesTab = ({ projectIds, hasSearched, isActive }: ProjectLibrariesTabProps) => {
	const [libraries, setLibraries] = useState<Library[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	return <>{'Libraries Tab to build later'}</>
}

export default ProjectLibrariesTab
