import React from 'react'
import { Typography } from 'antd'
import { mock as MOCK_LABWORK_OVERVIEW } from './LabworkModels' 
import LabworkOverviewProtocols from './LabworkOverviewProtocols'
import PageContent from '../../PageContent'
import AppPageHeader from '../../AppPageHeader'

const { Title } = Typography

const LabworkOverview = () => {

	
	// TODO Load labwork overview from redux
	// TODO loading flag

	const loading = false

	return (
		<>
			<AppPageHeader title="Lab Work" />				
			<PageContent loading={loading} style={{maxWidth: '50rem'} as any}>
				<LabworkOverviewProtocols summary={MOCK_LABWORK_OVERVIEW}/>
			</PageContent>
		</>
	)
}

export default LabworkOverview