import React from 'react'
import { ReferenceGenome } from '../../models/frontend_models'
import PageContainer from '../PageContainer'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'

export interface ReferenceGenomesListContentProps {
	referenceGenomes: ReferenceGenome[]
}

function ReferenceGenomesListContent({referenceGenomes} : ReferenceGenomesListContentProps) {
	return (
		<PageContainer>
			<AppPageHeader title='Reference Genomes'/>
			<PageContent>
				<div>Coming Soon</div>
			</PageContent>
		</PageContainer>
	)
}

export default ReferenceGenomesListContent