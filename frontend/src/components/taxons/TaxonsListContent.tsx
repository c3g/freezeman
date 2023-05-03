import React from 'react'
import { Taxon } from '../../models/frontend_models'
import PageContainer from '../PageContainer'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'

export interface TaxonsListContentProps {
	taxons: Taxon[]
}

function TaxonsListContent({taxons} : TaxonsListContentProps) {
	return (
		<PageContainer>
			<AppPageHeader title='Taxons'/>
			<PageContent>
				<div>Coming Soon</div>
			</PageContent>
		</PageContainer>
	)
}

export default TaxonsListContent

