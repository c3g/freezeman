import { useAppSelector } from "../../hooks";
import { selectExperimentRunsByID, selectExperimentRunsTable } from "../../selectors";
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks";
import ExperimentRunsTableActions from "../../modules/experimentRunsTable/actions"
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns";
import { EXPERIMENT_RUN_COLUMN_DEFINITIONS, EXPERIMENT_RUN_FILTER_DEFINITIONS, EXPERIMENT_RUN_FILTER_KEYS, ObjectWithExperimentRun } from "./ExperimentRunTableColumns";
import { useItemsByIDToDataObjects } from "../pagedItemsTable/useItemsByIDToDataObjects";
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import React from "react";
import FiltersBar from "../filters/filtersBar/FiltersBar";
import PagedItemsTable from "../pagedItemsTable/PagedItemsTable";

const tableColumns = [
    EXPERIMENT_RUN_COLUMN_DEFINITIONS.ID,
    EXPERIMENT_RUN_COLUMN_DEFINITIONS.NAME,
    EXPERIMENT_RUN_COLUMN_DEFINITIONS.RUN_TYPE,
    EXPERIMENT_RUN_COLUMN_DEFINITIONS.INSTRUMENT,
    EXPERIMENT_RUN_COLUMN_DEFINITIONS.INSTRUMENT_TYPE,
    EXPERIMENT_RUN_COLUMN_DEFINITIONS.CONTAINER_BARCODE,
    EXPERIMENT_RUN_COLUMN_DEFINITIONS.START_DATE,
    EXPERIMENT_RUN_COLUMN_DEFINITIONS.LAUNCH,
]
function ExperimentRunListContent() {
    const pagedItems = useAppSelector(selectExperimentRunsTable)
    const { filters } = pagedItems
    const callbacks = usePagedItemsActionsCallbacks(ExperimentRunsTableActions)
    const columns = useFilteredColumns(
        tableColumns,
        EXPERIMENT_RUN_FILTER_DEFINITIONS,
        EXPERIMENT_RUN_FILTER_KEYS,
        filters,
        callbacks.setFilterCallback,
        callbacks.setFilterOptionsCallback

    )
    const getDataObjectsByID = useItemsByIDToDataObjects(selectExperimentRunsByID, experimentRun => {return {experimentRun}})

    return (
        <>
			<AppPageHeader title="Experiment Runs"/>
			<PageContent>
				<FiltersBar filters={filters} clearFilters={callbacks.clearFiltersCallback}/>
				<PagedItemsTable<ObjectWithExperimentRun> 
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

export default ExperimentRunListContent