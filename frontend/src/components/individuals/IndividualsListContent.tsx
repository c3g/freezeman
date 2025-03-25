import React from 'react'
import { useAppSelector } from '../../hooks'
import { Individual } from '../../models/frontend_models'
import IndividualsTableActions from '../../modules/individualsTable/actions'
import { selectIndividualsByID, selectIndividualsTable } from '../../selectors'
import api from '../../utils/api'
import AddButton from '../AddButton'
import AppPageHeader from '../AppPageHeader'
import ExportButton from "../ExportButton"
import PageContent from '../PageContent'
import PagedItemsTable from '../pagedItemsTable/PagedItemsTable'
import { useFilteredColumns } from '../pagedItemsTable/useFilteredColumns'
import { useItemsByIDToDataObjects } from '../pagedItemsTable/useItemsByIDToDataObjects'
import useListExportCallback from '../pagedItemsTable/useListExportCallback'
import { usePagedItemsActionsCallbacks } from '../pagedItemsTable/usePagedItemsActionCallbacks'
import { INDIVIDUAL_COLUMN_DEFINITIONS, INDIVIDUAL_FILTER_DEFINITIONS, INDIVIDUAL_FILTER_KEYS, ObjectWithIndividual } from './IndividualsTableColumns'



const individualsListContentColumns = [
	INDIVIDUAL_COLUMN_DEFINITIONS.ID,
	INDIVIDUAL_COLUMN_DEFINITIONS.NAME,
	INDIVIDUAL_COLUMN_DEFINITIONS.TAXON,
	INDIVIDUAL_COLUMN_DEFINITIONS.SEX,
	INDIVIDUAL_COLUMN_DEFINITIONS.PEDIGREE,
	INDIVIDUAL_COLUMN_DEFINITIONS.COHORT
]

function wrapIndividual(individual: Individual) {
	return {individual}
}

function IndividualsListContent() {
	const individualsTableState = useAppSelector(selectIndividualsTable)
	const { filters, sortByList, totalCount } = individualsTableState

	const listExport = useListExportCallback(api.individuals.listExport, filters, sortByList)

	const mapIndividualIDs = useItemsByIDToDataObjects(selectIndividualsByID, wrapIndividual)

	const individualsTableCallbacks = usePagedItemsActionsCallbacks(IndividualsTableActions)

	const columns = useFilteredColumns(
			individualsListContentColumns,
			INDIVIDUAL_FILTER_DEFINITIONS,
			INDIVIDUAL_FILTER_KEYS,
			filters,
			individualsTableCallbacks.setFilterCallback,
			individualsTableCallbacks.setFilterOptionsCallback)
	return <>
		<AppPageHeader
			title='Individuals' extra={[
				<AddButton key='add' url="/individuals/add" />,
				<ExportButton key='export' exportType={''} exportFunction={listExport} filename="individuals"  itemsCount={totalCount}/>,
			]}
		/>
		<PageContent>
			<PagedItemsTable<ObjectWithIndividual>
				getDataObjectsByID={mapIndividualIDs}
				pagedItems={individualsTableState}
				columns = {columns}
				usingFilters = {true}
				{...individualsTableCallbacks}
			/>
		</PageContent>
	</>
}

export default IndividualsListContent