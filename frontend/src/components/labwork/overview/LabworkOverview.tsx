import React from 'react'
import { LabworkSummaryState } from '../../../modules/labwork/reducers'
import AppPageHeader from '../../AppPageHeader'
import PageContent from '../../PageContent'
import LabworkOverviewProtocols from './LabworkOverviewProtocols'


interface LabworkOverviewProps {
	state: LabworkSummaryState
}

const LabworkOverview = ({state} : LabworkOverviewProps) => {	

	// Only display loading indicator on initial load, not during every refresh.
	const loading = state.isFetching && !state.summary
	const refreshing = state.isFetching
	return (
		<>
			<AppPageHeader title="Lab Work" />

			<PageContent loading={loading} style={{maxWidth: '50rem'} as any}>
				{state.summary && 
					<LabworkOverviewProtocols summary={state.summary} hideEmptyProtocols={state.hideEmptyProtocols} refreshing={refreshing}/>
				}
			</PageContent>
		</>
	)
}

export default LabworkOverview