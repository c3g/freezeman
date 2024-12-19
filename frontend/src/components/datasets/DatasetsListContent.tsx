import React, { useCallback } from "react"
import AppPageHeader from "../AppPageHeader"
import PageContent from "../PageContent"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { selectDatasetsByID } from "../../selectors"
import FiltersBar from "../filters/filtersBar/FiltersBar"
import PagedItemsTable from "../pagedItemsTable/PagedItemsTable"
import { DATASET_COLUMN_DEFINITIONS, DATASET_FILTER_DEFINITIONS, DATASET_FILTER_KEYS, ObjectWithDataset } from "./DatasetsTableColumns"
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns"
import { useItemsByIDToDataObjects } from "../pagedItemsTable/useItemsByIDToDataObjects"
import ExpandableTableDatasetComments from "./ExpandableTableDatasetComments"
import { PagedItemsListFuncType, usePagedItems } from "../../models/paged_items_factory"
import { list as listDatasets } from "../../modules/datasets/actions"
import { Dataset } from "../../models/frontend_models"


const tableColumns = [
	DATASET_COLUMN_DEFINITIONS.ID,
	DATASET_COLUMN_DEFINITIONS.RUN,
	DATASET_COLUMN_DEFINITIONS.PROJECT,
	DATASET_COLUMN_DEFINITIONS.LANE,
	DATASET_COLUMN_DEFINITIONS.VALIDATION_STATUS,
	DATASET_COLUMN_DEFINITIONS.READSETS_RELEASED,
	DATASET_COLUMN_DEFINITIONS.LATEST_UPDATE
]

function DatasetsListContent() {
	const dispatch = useAppDispatch()
	const pageSize = useAppSelector(state => state.pagination.pageSize)
	const datasetsByID = useAppSelector(selectDatasetsByID)

	const list: PagedItemsListFuncType<Dataset> = useCallback(async (options) => {
		const results = await dispatch(listDatasets(options))
		return {
			results: results.results.map((d) => datasetsByID[d.id]),
			count: results.count
		}
	}, [datasetsByID, dispatch])
	const [pagedItems, pagedItemsActions] = usePagedItems(list, () => pageSize)
	const { filters } = pagedItems

  const tweakedColumns = useFilteredColumns(
          tableColumns,
          DATASET_FILTER_DEFINITIONS,
          DATASET_FILTER_KEYS,
          filters,
          pagedItemsActions.setFilter,
          pagedItemsActions.setFilterOptions)


	const getDataObjectsByID = useItemsByIDToDataObjects(selectDatasetsByID, dataset => {return {dataset}})
		return(
			<>
				<AppPageHeader title="Datasets"/>
				<PageContent>
					<FiltersBar filters={filters} clearFilters={pagedItemsActions.clearFilters}/>
					<PagedItemsTable<ObjectWithDataset>
						columns={tweakedColumns}
						expandable={ExpandableTableDatasetComments()}
						getDataObjectsByID={getDataObjectsByID}
						pagedItems={pagedItems}
						pagedItemsActions={pagedItemsActions}
						usingFilters={false}
					/>
				</PageContent>
		</>
	)
}

export default DatasetsListContent
