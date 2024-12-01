import React, { FunctionComponent, useMemo } from "react"
import PageContent from "../PageContent"
import { useAppSelector } from "../../hooks"
import { selectDatasetsByID, selectDatasetsTable } from "../../selectors"
import DatasetsTableActions from '../../modules/datasetsTable/actions'
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks"
import FiltersBar from "../filters/filtersBar/FiltersBar"
import PagedItemsTable from "../pagedItemsTable/PagedItemsTable"
import { DATASET_COLUMN_DEFINITIONS, DATASET_FILTER_DEFINITIONS, DATASET_FILTER_KEYS, DatasetColumnID, ObjectWithDataset } from "./ReportsTableConfig"
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns"
import { useItemsByIDToDataObjects } from "../pagedItemsTable/useItemsByIDToDataObjects"
import dummy from './dummy.json'
import { FILTER_TYPE } from "../../constants"
import { RUN_TYPES } from "../experimentRuns/ExperimentRunsDetachedFilters"
import { FilterDescription } from "../../models/paged_items"
// import ExpandableTableDatasetComments from "./ExpandableTableDatasetComments"
// import { setColumnWidths } from "../pagedItemsTable/tableColumnUtilities"

const EXPERIMENT_RUNS_PLATFORM_NAME_FILTER: FilterDescription = {
    type: FILTER_TYPE.SELECT,
    key: 'run_type__name',
    label: 'Run Type',
    mode: 'multiple',
    placeholder: 'All',
    options: Object.values(RUN_TYPES).map((runType) => ({label: runType, value: runType})),
}

const tableColumns = [
	DATASET_COLUMN_DEFINITIONS.ID,
	DATASET_COLUMN_DEFINITIONS.RUN,
	DATASET_COLUMN_DEFINITIONS.PROJECT,
	DATASET_COLUMN_DEFINITIONS.LANE,
	DATASET_COLUMN_DEFINITIONS.VALIDATION_STATUS,
	DATASET_COLUMN_DEFINITIONS.READSETS_RELEASED,
	DATASET_COLUMN_DEFINITIONS.LATEST_UPDATE
]

interface ReportsListContentProps {

}

const ReportsListContent: FunctionComponent<ReportsListContentProps> = () => {
	const pagedItems = useAppSelector(selectDatasetsTable)
	const { filters } = pagedItems

	const callbacks = usePagedItemsActionsCallbacks(DatasetsTableActions)

  let tweakedColumns = useFilteredColumns(
          tableColumns,
          DATASET_FILTER_DEFINITIONS,
          DATASET_FILTER_KEYS,
          filters,
          callbacks.setFilterCallback,
          callbacks.setFilterOptionsCallback)


	const getDataObjectsByID = useItemsByIDToDataObjects(selectDatasetsByID, dataset => {return {dataset}})

  return (
      <>
					{/* <FiltersBar filters={filters} clearFilters={callbacks.clearFiltersCallback}/> */}
					<PagedItemsTable<ObjectWithDataset>
						columns={tweakedColumns}
						// expandable={ExpandableTableDatasetComments()}
						getDataObjectsByID={getDataObjectsByID}
						pagedItems={pagedItems}
						usingFilters={false}
						{...callbacks}
					/>
      </>
   );
}

export default ReportsListContent;

