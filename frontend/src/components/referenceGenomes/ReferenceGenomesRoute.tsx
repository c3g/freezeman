import React from 'react'
import { useAppSelector } from '../../hooks'
import { selectReferenceGenomesByID } from '../../selectors'
import { getAllItems } from '../../models/frontend_models'
import ReferenceGenomesListContent from './ReferenceGenomesListContent'
import { Navigate, Route, Routes } from 'react-router-dom'
import PageContainer from '../PageContainer'
import { AddReferenceGenomeRoute, EditReferenceGenomeRoute } from './EditReferenceGenomes'


function ReferenceGenomesRoute() {


	return (
		<PageContainer>
			<Routes>
				<Route path="/list/*" element={<ReferenceGenomesListContent />} />
				<Route path="/update/:id/*" element={<EditReferenceGenomeRoute />} />
				<Route path="/add/*" element={<AddReferenceGenomeRoute />} />
				<Route path="*" element={<Navigate to="/genomes/list" replace />} />
			</Routes>
		</PageContainer>

	)
}

export default ReferenceGenomesRoute