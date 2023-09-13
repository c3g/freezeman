import React, { useReducer } from "react"
import AppPageHeader from "../AppPageHeader"
import PageContent from "../PageContent"
import { useAppSelector } from "../../hooks";
import ReadsetTableActions from "../../modules/readsetsTable/actions"
import { selectDatasetFilesByID, selectReadsetsByID, selectReadsetsTable } from "../../selectors";
import { ObjectWithReadset, READSET_COLUMN_DEFINITIONS, READSET_COLUMN_FILTERS, READSET_FILTER_KEYS } from "./ReadsetsTableColumns";
import { Readset } from "../../models/frontend_models";
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks";
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns";
import { useItemsByIDToDataObjects } from '../pagedItemsTable/useItemsByIDToDataObjects'
import PagedItemsTable from "../pagedItemsTable/PagedItemsTable";
import FiltersBar from "../filters/filtersBar/FiltersBar";
import FilterPanel from "../filters/filterPanel/FilterPanel";




const wrapReadset = (readset: Readset): ObjectWithReadset => {
    return { readset }
}
const ReadsetsListContent = () => {
    const filesById = useAppSelector(selectDatasetFilesByID)
    const readsetTableState = useAppSelector(selectReadsetsTable)
    const { filters, sortBy, totalCount } = readsetTableState
    const readsetTableCallbacks = usePagedItemsActionsCallbacks(ReadsetTableActions)
    const releaseStatusOptionReducer = (state, action) => {
        switch (action.type) {
            case "all":
                return { all: action.release_status, specific: {} }
            case "toggle": {
                const { all } = state
                const { id, releaseStatus, filesById } = action
                const newState = { ...state, specific: { ...state.specific } }
    
                if (all) {
                    if (all !== releaseStatus) {
                        newState.specific[id] = releaseStatus
                    } else {
                        delete newState.specific[id]
                    }
                } else {
                    if (filesById[id]?.release_status !== releaseStatus) {
                        newState.specific[id] = releaseStatus
                    } else {
                        delete newState.specific[id]
                    }
                }
    
                return newState
            }
        }
    }
    const [releaseStatusOption, dispatchReleaseStatusOption] = useReducer(
        releaseStatusOptionReducer,
        {
            all: undefined,
            specific: {},
        }
    )
    const columnDefinitions = READSET_COLUMN_DEFINITIONS((id, releaseStatus) => {
        dispatchReleaseStatusOption({ type: "toggle", id, releaseStatus, filesById })
    }, releaseStatusOption)
    const readsetTableColumns = [
        columnDefinitions.ID,
        columnDefinitions.SAMPLE_NAME,
        columnDefinitions.RELEASE_STATUS,
        columnDefinitions.LIBRARY_TYPE,
        columnDefinitions.INDEX,
        columnDefinitions.NUM_READS,
        columnDefinitions.NUM_BASES,
        columnDefinitions.MEAN_QUALITY_SCORE,
        columnDefinitions.BLAST_HIT
    ]
    const columns = useFilteredColumns(
        readsetTableColumns,
        READSET_COLUMN_FILTERS,
        READSET_FILTER_KEYS,
        filters,
        readsetTableCallbacks.setFilterCallback,
        readsetTableCallbacks.setFilterOptionsCallback
    )
    const mapContainerIDs = useItemsByIDToDataObjects(selectReadsetsByID, wrapReadset)
    return <>
        <AppPageHeader title="Readsets" />
        <PageContent>
            <FilterPanel
                descriptions={[]}
                filters={filters}
                setFilter={readsetTableCallbacks.setFilterCallback}
                setFilterOption={readsetTableCallbacks.setFilterOptionsCallback}
            />
            <FiltersBar filters={filters} clearFilters={readsetTableCallbacks.clearFiltersCallback} />
            <PagedItemsTable<ObjectWithReadset>
                columns={columns}
                getDataObjectsByID={mapContainerIDs}
                pagedItems={readsetTableState}
                usingFilters={false}
                {...readsetTableCallbacks}
            />

        </PageContent>
    </>;
}
export default ReadsetsListContent