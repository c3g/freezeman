import React from 'react'
import { Route, Routes } from 'react-router-dom'
import PageContainer from '../PageContainer'
import LabworkOverview from './overview/LabworkOverview'


const LabworkPage = () => {
	return (
		<PageContainer>
			<Routes>
				<Route path="*" element={<LabworkOverview />}/>
			</Routes>
		</PageContainer>
	)
}

export default LabworkPage