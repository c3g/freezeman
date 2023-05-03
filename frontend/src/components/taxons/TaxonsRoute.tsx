import React, { useState } from 'react'
import { useAppSelector } from '../../hooks'
import { selectTaxonsByID } from '../../selectors'
import { getAllItems } from '../../models/frontend_models'
import TaxonsListContent from './TaxonsListContent'
import PageContainer from '../PageContainer'
import { Navigate, Route, Routes } from 'react-router-dom'
import EditTaxon, { Taxon } from './EditTaxon'

function TaxonsRoute() {
	const taxonsState = useAppSelector(selectTaxonsByID)
	const [editTaxon, setEditTaxon] = useState<Taxon>({ id: -1, ncbi_id: -2, name: '' })
	const taxons = getAllItems(taxonsState)

	return (
		<PageContainer>
			<Routes>
				<Route path="/list/*" element={<TaxonsListContent taxons={taxons} editTaxon={(taxon: Taxon) => setEditTaxon(taxon)} />} />
				<Route path="/edit/*" element={<EditTaxon taxon={editTaxon} />} />
				<Route path="*" element={<Navigate to="/taxons/list" replace />} />
			</Routes>
		</PageContainer>

	)
}

export default TaxonsRoute