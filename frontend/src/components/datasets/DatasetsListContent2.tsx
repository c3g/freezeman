import React from "react"
import AppPageHeader from "../AppPageHeader"
import PageContent from "../PageContent"
import { useAppSelector } from "../../hooks"
import { selectDatasetsByID, selectDatasetsTable } from "../../selectors"
import DatasetsTableActions from '../../modules/datasetsTable/actions'
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks"
import FiltersBar from "../filters/filtersBar/FiltersBar"
import PagedItemsTable from "../pagedItemsTable/PagedItemsTable"
import { DATASET_COLUMN_DEFINITIONS, DATASET_FILTER_DEFINITIONS, DATASET_FILTER_KEYS, ObjectWithDataset } from "./DatasetsTableColumns"
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns"
import { useItemsByIDToDataObjects } from "../pagedItemsTable/useItemsByIDToDataObjects"


const tableColumns = [
	DATASET_COLUMN_DEFINITIONS.ID,
	DATASET_COLUMN_DEFINITIONS.RUN,
	DATASET_COLUMN_DEFINITIONS.PROJECT,
	DATASET_COLUMN_DEFINITIONS.LANE,
	DATASET_COLUMN_DEFINITIONS.READSETS_RELEASED,
	DATASET_COLUMN_DEFINITIONS.LATEST_UPDATE
]

function DatasetsListContent() {

	const pagedItems = useAppSelector(selectDatasetsTable)
	const { filters } = pagedItems

	const callbacks = usePagedItemsActionsCallbacks(DatasetsTableActions)

	const columns = useFilteredColumns(
						tableColumns, 
						DATASET_FILTER_DEFINITIONS,
						DATASET_FILTER_KEYS,
						filters,
						callbacks.setFilterCallback,
						callbacks.setFilterOptionsCallback)

	const getDataObjectsByID = useItemsByIDToDataObjects(selectDatasetsByID, dataset => {return {dataset}})

	return(
		<>
			<AppPageHeader title="Datasets"/>
			<PageContent>
				<FiltersBar filters={filters} clearFilters={callbacks.clearFiltersCallback}/>
				<PagedItemsTable<ObjectWithDataset> 
					columns={columns}
					getDataObjectsByID={getDataObjectsByID}
					pagedItems={pagedItems}
					usingFilters={false}
					{...callbacks}
				/>
			</PageContent>
		</>
	)
}

export default DatasetsListContent
