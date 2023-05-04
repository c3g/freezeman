import React from 'react'
import { useAppSelector } from '../../hooks'
import { selectReferenceGenomesByID } from '../../selectors'
import { getAllItems } from '../../models/frontend_models'
import ReferenceGenomesListContent from './ReferenceGenomesListContent'


function ReferenceGenomesRoute() {
	const referenceGenomesState = useAppSelector(selectReferenceGenomesByID)
	const referenceGenomes = getAllItems(referenceGenomesState)

	return (
		<ReferenceGenomesListContent referenceGenomes={referenceGenomes}/>
	)
}

export default ReferenceGenomesRoute