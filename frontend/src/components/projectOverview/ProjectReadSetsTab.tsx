import React from 'react'
import { useState } from 'react'
interface ProjectReadSetsTabProps {
	projectIds: readonly number[]
	hasSearched: boolean
	isActive: boolean
}

interface ReadSet {}

function ProjectReadSetsTab({ projectIds, hasSearched, isActive }: ProjectReadSetsTabProps) {
	const [readSets, setReadSets] = useState<ReadSet[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	return <>{'Read Sets Tab'}</>
}

export default ProjectReadSetsTab
