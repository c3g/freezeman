import { Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { getLabworkSummary } from '../../../modules/labwork/actions'
import { selectLabworkSummaryState } from '../../../selectors'
import AppPageHeader from '../../AppPageHeader'
import PageContent from '../../PageContent'
import LabworkOverviewProtocols from './LabworkOverviewProtocols'

const { Title } = Typography

const LabworkOverview = () => {
	const [loading, setLoading] = useState(false)
	const [showEmpty, setShowEmpty] = useState(true)
	const labworkSummaryState = useAppSelector(selectLabworkSummaryState)
	const dispatch = useAppDispatch()

	useEffect(() => {
		if (labworkSummaryState.summary) {
			setLoading(false)
		} else {
			if (!labworkSummaryState.isFetching) {
				setLoading(true)
				dispatch(getLabworkSummary())
			}
		}
	}, [labworkSummaryState])
	
	return (
		<>
			<AppPageHeader title="Lab Work" />				
			<PageContent loading={loading} style={{maxWidth: '50rem'} as any}>
				{labworkSummaryState.summary && 
					<LabworkOverviewProtocols summary={labworkSummaryState.summary} hideEmptyProtocols={labworkSummaryState.hideEmptyProtocols}/>
				}
			</PageContent>
		</>
	)
}

export default LabworkOverview