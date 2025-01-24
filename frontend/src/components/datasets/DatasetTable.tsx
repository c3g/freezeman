import React, { useEffect, useMemo } from "react"
import { useAppSelector } from "../../hooks"
import { selectDatasetsByID, selectDatasetsTable } from "../../selectors"
import DatasetsTableActions from '../../modules/datasetsTable/actions'
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks"
import FiltersBar from "../filters/filtersBar/FiltersBar"
import PagedItemsTable, { PagedItemsTableProps } from "../pagedItemsTable/PagedItemsTable"
import { DATASET_COLUMN_DEFINITIONS, DATASET_FILTER_DEFINITIONS, DATASET_FILTER_KEYS, ObjectWithDataset } from "./DatasetsTableColumns"
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns"
import { useItemsByIDToDataObjects } from "../pagedItemsTable/useItemsByIDToDataObjects"
import ExpandableTableDatasetComments from "./ExpandableTableDatasetComments"
import { ExperimentRun } from "../../models/frontend_models"

export interface DatasetTableProps {
	run_name?: ExperimentRun['name']
	scroll?: NonNullable<PagedItemsTableProps<ObjectWithDataset>['scroll']>
}
function DatasetTable({ run_name, scroll }: DatasetTableProps) {

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
			DATASET_COLUMN_DEFINITIONS.LATEST_VALIDATION_UPDATE,
			DATASET_COLUMN_DEFINITIONS.READSETS_RELEASED,
			DATASET_COLUMN_DEFINITIONS.LATEST_RELEASE_UPDATE,
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
                <FiltersBar filters={filters} clearFilters={callbacks.clearFiltersCallback}/>
                <PagedItemsTable<ObjectWithDataset>
                    columns={tweakedColumns}
                    expandable={ExpandableTableDatasetComments()}
                    getDataObjectsByID={getDataObjectsByID}
                    pagedItems={pagedItems}
                    usingFilters={false}
                    {...callbacks}
					scroll={scroll}
                />
		</>
	)
}

export default DatasetTable
