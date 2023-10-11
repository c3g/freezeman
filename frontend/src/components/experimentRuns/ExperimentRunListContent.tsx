import { useAppSelector } from "../../hooks";
import { selectExperimentRunLaunches, selectExperimentRunsByID, selectExperimentRunsTable, selectInstrumentsByID, selectRunTypesByID } from "../../selectors";
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks";
import ExperimentRunsTableActions from "../../modules/experimentRunsTable/actions"
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns";
import { EXPERIMENT_RUN_FILTER_DEFINITIONS, EXPERIMENT_RUN_FILTER_KEYS, ObjectWithExperimentRun, getColumnsForExperimentRun } from "./ExperimentRunTableColumns";
import { useItemsByIDToDataObjects } from "../pagedItemsTable/useItemsByIDToDataObjects";
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import React from "react";
import FiltersBar from "../filters/filtersBar/FiltersBar";
import PagedItemsTable from "../pagedItemsTable/PagedItemsTable";

function ExperimentRunListContent() {
    const pagedItems = useAppSelector(selectExperimentRunsTable)
    const launches = useAppSelector(selectExperimentRunLaunches)
    const runTypesById = useAppSelector(selectRunTypesByID)
    const instrumentsById = useAppSelector(selectInstrumentsByID)
    const tableColumns = getColumnsForExperimentRun(launches.launchesById, runTypesById, instrumentsById)
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