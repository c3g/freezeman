import React from 'react'
import { useState } from 'react'
interface ProjectAnalysisTabProps {
	projectIds: readonly number[]
	hasSearched: boolean
	isActive: boolean
}

interface Analysis {}

const ProjectAnalysisTab = ({ projectIds, hasSearched, isActive }: ProjectAnalysisTabProps) => {
	const [analysis, setAnalysis] = useState<Analysis[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	return <>{'Analysis Tab to build later'}</>
}

export default ProjectAnalysisTab
