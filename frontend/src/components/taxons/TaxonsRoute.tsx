import React from 'react'
import { useAppSelector } from '../../hooks'
import { selectTaxonsByID } from '../../selectors'
import { Taxon, getAllItems } from '../../models/frontend_models'
import TaxonsListContent from './TaxonsListContent'
import PageContainer from '../PageContainer'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AddTaxonRoute, EditTaxonRoute } from './EditTaxon'

const TaxonsRoute = () => {
	return (
		<PageContainer>
			<Routes>
				<Route path="/list/*" element={<TaxonsListContent />} />
				<Route path="/update/:id/*" element={<EditTaxonRoute/>} />
				<Route path="/add" element={<AddTaxonRoute/>} />
				<Route path="*" element={<Navigate to="/taxons/list" replace />} />
			</Routes>
		</PageContainer>

	)
}

export default TaxonsRoute