import React, { useMemo } from 'react'
import { Taxon, } from '../../models/frontend_models'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import AddButton from '../AddButton'
import { TAXON_FILTERS, TAXON_FILTER_KEYS, getColumnsForTaxon } from './TaxonTableColumns'
import { useAppSelector } from '../../hooks'
import { selectAuthState, selectTaxonsByID, selectTaxonsTable, selectUsersByID } from '../../selectors'
import TaxonsTableActions from '../../modules/taxonsTable/actions'
import PagedItemsTable, { useFilteredColumns, useItemsByIDToDataObjects, usePagedItemsActionsCallbacks } from '../pagedItemsTable/PagedItemsTable'

export interface TaxonsListContentProps {}

function TaxonsListContent() {
	const taxonsTable = useAppSelector(selectTaxonsTable)
	const authState = useAppSelector(selectAuthState)
	const usersByID = useAppSelector(selectUsersByID)
	const hasWritePermission = ((authState.currentUserID && usersByID[authState.currentUserID]) ? usersByID[authState.currentUserID].is_superuser : false)
	const taxonColumns = useMemo(() => getColumnsForTaxon(hasWritePermission), [hasWritePermission])

	const tableCallbacks = usePagedItemsActionsCallbacks(TaxonsTableActions)

	const columns = useFilteredColumns<Taxon>(
		taxonColumns,
		TAXON_FILTERS,
		TAXON_FILTER_KEYS,
		taxonsTable.filters,
		tableCallbacks.setFilterCallback,
		tableCallbacks.setFilterOptionsCallback
	)

	const mapTaxonIDs = useItemsByIDToDataObjects(selectTaxonsByID, taxon => taxon)

	return (
		<>
			<AppPageHeader title="Taxons" extra={[
				<AddButton key='add' url="/taxons/add" />,]} />
			<PageContent>
				<PagedItemsTable
					columns={columns}
					getDataObjectsByID={mapTaxonIDs}
					pagedItems={taxonsTable}
					usingFilters={true}
					{...tableCallbacks}
				/>
			</PageContent>
		</>
	);
}

export default TaxonsListContent
