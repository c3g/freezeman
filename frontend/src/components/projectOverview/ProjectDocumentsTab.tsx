import React from 'react'
import { useState } from 'react'
interface ProjectDocumentsTabProps {
	projectIds: readonly number[]
	hasSearched: boolean
	isActive: boolean
}

interface ProjectDocument {}

const ProjectDocumentsTab = ({ projectIds, hasSearched, isActive }: ProjectDocumentsTabProps) => {
	const [documents, setDocuments] = useState<ProjectDocument[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	return <>{'Documents Tab to build later'}</>
}

export default ProjectDocumentsTab
