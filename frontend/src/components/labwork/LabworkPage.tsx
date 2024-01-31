import React, { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { flushLabworkSummary, getLabworkSummary } from '../../modules/labwork/actions'
import { selectAppInitialized, selectLabworkSummaryState } from '../../selectors'
import ActionContent from '../ActionContent'
import PageContainer from '../PageContainer'
import LabworkOverviewRoute from './overview/LabworkOverviewRoute'
import LabworkStepRoute from './step/LabworkStepRoute'
import LibraryTransferStep from '../libraryTransfer/LibraryTransferStep'

const LabworkPage = () => {
	// Load the labwork summary whenever the user hits a page in the Lab Work section.
	// This could be the summary or a step page. It ensures that the labwork summary
	// is loaded no matter which route is selected.
	const [loading, setLoading] = useState(false)
	const labworkSummaryState = useAppSelector(selectLabworkSummaryState)
	const appInitialized = useAppSelector(selectAppInitialized)
	const dispatch = useAppDispatch()

	useEffect(() => {
		if (labworkSummaryState.summary) {
			setLoading(false)
		} else {
			// The summary can't be loaded until the workflow definitions have been loaded during
			// app initialization.
			if (!loading && appInitialized && !labworkSummaryState.isFetching) {
				setLoading(true)
				dispatch(getLabworkSummary())
			}
		}
	}, [loading, appInitialized, labworkSummaryState, dispatch])

	useEffect(() => {
		// Flush the labwork state when the user navigates away from the
		// the labwork section.
		return () => {
			dispatch(flushLabworkSummary())
		}
	}, [dispatch])

	return (
		<PageContainer>
			<Routes>
				<Route path="*" element={<LabworkOverviewRoute />} />
				<Route path="step/:stepID/*" element={<LabworkStepRoute />} />
				<Route path="step/:stepID/actions/:action/*" element={<ActionContent templateType="sampleNextStep" />}/>
			</Routes>
		</PageContainer>
	)
}

export default LabworkPage
