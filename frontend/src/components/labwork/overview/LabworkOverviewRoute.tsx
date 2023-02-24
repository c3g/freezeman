import React from 'react'
import { useAppSelector } from '../../../hooks'
import { selectLabworkSummaryState } from '../../../selectors'
import LabworkOverview from './LabworkOverview'


const LabworkOverviewRoute = () => {
	const labworkSummaryState = useAppSelector(selectLabworkSummaryState)

	return (
		<LabworkOverview state={labworkSummaryState}/>
	)
}

export default LabworkOverviewRoute