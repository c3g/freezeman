import React from 'react'
import { LabworkSummaryState } from '../../../modules/labwork/reducers'
import AppPageHeader from '../../AppPageHeader'
import PageContent from '../../PageContent'
import LabworkOverviewProtocols from './LabworkOverviewProtocols'
import LabworkOverviewAutomations from './LabworkOverviewAutomations'

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
          <div>
					  <LabworkOverviewProtocols summary={state.summary} hideEmptySections={state.hideEmptySections} refreshing={refreshing}/>
            <div style={{ padding: '1rem' }}></div>
            <LabworkOverviewAutomations summary={state.summary} hideEmptySections={state.hideEmptySections}/>
          </div>
				}
			</PageContent>
		</>
	)
}

export default LabworkOverview