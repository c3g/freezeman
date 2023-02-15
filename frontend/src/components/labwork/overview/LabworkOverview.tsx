import { Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { getLabworkSummary } from '../../../modules/labwork/actions'
import { LabworkSummaryState } from '../../../modules/labwork/reducers'
import { selectLabworkSummaryState } from '../../../selectors'
import AppPageHeader from '../../AppPageHeader'
import PageContent from '../../PageContent'
import LabworkOverviewProtocols from './LabworkOverviewProtocols'

const { Title } = Typography

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