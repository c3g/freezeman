import { useAppSelector } from "../../hooks";
import { selectExperimentRunLaunches, selectExperimentRunsByID, selectExperimentRunsTable, selectInstrumentsByID, selectRunTypesByID } from "../../selectors";
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks";
import ExperimentRunsTableActions from "../../modules/experimentRunsTable/actions"
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns";
import { EXPERIMENT_RUN_FILTER_DEFINITIONS, EXPERIMENT_RUN_FILTER_KEYS, ObjectWithExperimentRun, getColumnsForExperimentRun } from "./ExperimentRunTableColumns";
import { useItemsByIDToDataObjects } from "../pagedItemsTable/useItemsByIDToDataObjects";
import React, { useEffect } from "react";
import PagedItemsTable from "../pagedItemsTable/PagedItemsTable";
import { EXPERIMENT_RUNS_PLATFORM_NAME_FILTER, EXPERIMENT_RUN_PROCESS_FILTER } from "./ExperimentRunsDetachedFilters"
import FilterPanel from "../filters/filterPanel/FilterPanel";
import Flexbar from "../shared/Flexbar";
import FiltersBar from "../filters/filtersBar/FiltersBar";


const detachedFilters = [
	EXPERIMENT_RUNS_PLATFORM_NAME_FILTER,
    EXPERIMENT_RUN_PROCESS_FILTER
]

function ExperimentRunListContent() {
    const experimentRunsTableState = useAppSelector(selectExperimentRunsTable)
    const launches = useAppSelector(selectExperimentRunLaunches)
    const runTypesById = useAppSelector(selectRunTypesByID)
    const instrumentsById = useAppSelector(selectInstrumentsByID)
    const tableColumns = getColumnsForExperimentRun(launches.launchesById, runTypesById, instrumentsById)
    const { filters } = experimentRunsTableState
    const callbacks = usePagedItemsActionsCallbacks(ExperimentRunsTableActions)
    const getDataObjectsByID = useItemsByIDToDataObjects(selectExperimentRunsByID, experimentRun => { return { experimentRun } })
    const columns = useFilteredColumns(
        tableColumns,
        EXPERIMENT_RUN_FILTER_DEFINITIONS,
        EXPERIMENT_RUN_FILTER_KEYS,
        filters,
        callbacks.setFilterCallback,
        callbacks.setFilterOptionsCallback
    )

    useEffect(()=>{
        // default setting set at the redux level
        callbacks.setFilterCallback(["ILLUMINA"],EXPERIMENT_RUNS_PLATFORM_NAME_FILTER)
    },[])

    return (
        <>
            <Flexbar style={{alignItems: 'center', paddingBottom: "10px"}}>
                <FilterPanel descriptions={detachedFilters}
                    filters={experimentRunsTableState.filters}
                    setFilter={callbacks.setFilterCallback}
                    setFilterOption={callbacks.setFilterOptionsCallback}
                    withCollapsible={false}/>
                <FiltersBar filters={filters} clearFilters={callbacks.clearFiltersCallback}/>
            </Flexbar>
            <PagedItemsTable<ObjectWithExperimentRun>
                columns={columns}
                getDataObjectsByID={getDataObjectsByID}
                pagedItems={experimentRunsTableState}
                usingFilters={true}
                {...callbacks}/>
		</>
    )
}

export default ExperimentRunListContent