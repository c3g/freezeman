import React from 'react'
import { useAppSelector } from '../../hooks'
import { selectTaxonsByID } from '../../selectors'
import { getAllItems } from '../../models/frontend_models'
import TaxonsListContent from './TaxonsListContent'

function TaxonsRoute() {
	const taxonsState = useAppSelector(selectTaxonsByID)
	const taxons = getAllItems(taxonsState)

	return (
		<TaxonsListContent taxons={taxons}/>
	)
}

export default TaxonsRoute