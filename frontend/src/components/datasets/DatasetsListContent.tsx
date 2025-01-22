import React, { useEffect, useMemo } from "react"
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
import ExpandableTableDatasetComments from "./ExpandableTableDatasetComments"
import { ExperimentRun } from "../../models/frontend_models"

export interface DatasetsListContentProps {
	run_name?: ExperimentRun['name']
}
function DatasetsListContent({ run_name }: DatasetsListContentProps) {

	const pagedItems = useAppSelector(selectDatasetsTable)
	const { filters } = pagedItems

	const callbacks = usePagedItemsActionsCallbacks(DatasetsTableActions)
	useEffect(() => {
		if (run_name) {
			callbacks.setFilterCallback(DATASET_FILTER_KEYS.RUN, DATASET_FILTER_DEFINITIONS[DATASET_FILTER_KEYS.RUN])
		}
	}, [callbacks, run_name])

	const tableColumns = useMemo(() => {
		const columns = [
			DATASET_COLUMN_DEFINITIONS.ID,
			...(run_name ? [] : [DATASET_COLUMN_DEFINITIONS.RUN]),
			DATASET_COLUMN_DEFINITIONS.PROJECT,
			DATASET_COLUMN_DEFINITIONS.LANE,
			DATASET_COLUMN_DEFINITIONS.VALIDATION_STATUS,
			DATASET_COLUMN_DEFINITIONS.READSETS_RELEASED,
			DATASET_COLUMN_DEFINITIONS.LATEST_RELEASE_UPDATE,
			DATASET_COLUMN_DEFINITIONS.LATEST_VALIDATION_UPDATE
		]
		return columns
	}, [run_name])

  	const tweakedColumns = useFilteredColumns(
          tableColumns,
          DATASET_FILTER_DEFINITIONS,
          DATASET_FILTER_KEYS,
          filters,
          callbacks.setFilterCallback,
          callbacks.setFilterOptionsCallback
	)

	const getDataObjectsByID = useItemsByIDToDataObjects(selectDatasetsByID, dataset => {return {dataset}})
		return(
			<>
				<AppPageHeader title="Datasets"/>
				<PageContent>
					<FiltersBar filters={filters} clearFilters={callbacks.clearFiltersCallback}/>
					<PagedItemsTable<ObjectWithDataset>
						columns={tweakedColumns}
						expandable={ExpandableTableDatasetComments()}
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
