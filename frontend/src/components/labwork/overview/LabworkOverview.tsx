import React from 'react'
import { LabworkSummaryState } from '../../../modules/labwork/reducers'
import AppPageHeader from '../../AppPageHeader'
import PageContent from '../../PageContent'
import LabworkOverviewProtocols from './LabworkOverviewProtocols'


interface LabworkOverviewProps {
	state: LabworkSummaryState
}

const LabworkOverview = ({state} : LabworkOverviewProps) => {	
	return (
		<>
			<AppPageHeader title="Lab Work" />				
			<PageContent loading={state.isFetching} style={{maxWidth: '50rem'} as any}>
				{state.summary && 
					<LabworkOverviewProtocols summary={state.summary} hideEmptyProtocols={state.hideEmptyProtocols}/>
				}
			</PageContent>
		</>
	)
}

export default LabworkOverview