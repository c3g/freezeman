import React, { useEffect, useReducer, useState } from "react"
import AppPageHeader from "../AppPageHeader"
import PageContent from "../PageContent"
import { useAppDispatch, useAppSelector } from "../../hooks";
import ReadsetTableActions from "../../modules/readsetsTable/actions"
import { selectDatasetFilesByID, selectReadsetsByID, selectReadsetsTable } from "../../selectors";
import { BLOCKED, ObjectWithReadset, READSET_COLUMN_DEFINITIONS, READSET_COLUMN_FILTERS, READSET_FILTER_KEYS, RELEASED } from "./ReadsetsTableColumns";
import { Dataset, Readset } from "../../models/frontend_models";
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks";
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns";
import { useItemsByIDToDataObjects } from '../pagedItemsTable/useItemsByIDToDataObjects'
import PagedItemsTable from "../pagedItemsTable/PagedItemsTable";
// import FiltersBar from "../filters/filtersBar/FiltersBar";
// import FilterPanel from "../filters/filterPanel/FilterPanel";
import { Button } from "antd";
import { setReleaseStatus } from "../../modules/datasets/actions";
import { update } from "../../modules/readsets/actions";
import { ValidationStatus } from "../../modules/experimentRunLanes/models";
import api from "../../utils/api";


interface ReadsetsListContentProps {
    dataset?: Dataset
    laneValidationStatus?: ValidationStatus
}

const wrapReadset = (readset: Readset): ObjectWithReadset => {
    return { readset }
}
const ReadsetsListContent = ({ dataset, laneValidationStatus}: ReadsetsListContentProps) => {
    const readsetsByID = useAppSelector(selectReadsetsByID)
    const readsetTableState = useAppSelector(selectReadsetsTable)
    const readsetTableCallbacks = usePagedItemsActionsCallbacks(ReadsetTableActions)
    const dispatch = useAppDispatch()
    const { filters, sortBy, totalCount } = readsetTableState
    const allFilesReleased = dataset?.released_status_count === Object.keys(readsetsByID).length
    const allFilesBlocked = dataset?.blocked_status_count === Object.keys(readsetsByID).length

    const canReleaseOrBlockFiles = (laneValidationStatus === ValidationStatus.PASSED || laneValidationStatus === ValidationStatus.FAILED)

    let laneValidationStatusString = ''
    if (laneValidationStatus !== undefined) {
        switch (laneValidationStatus) {
            case ValidationStatus.AVAILABLE:
                laneValidationStatusString = 'Awaiting validation'
                break
            case ValidationStatus.PASSED:
                laneValidationStatusString = 'Passed'
                break
            case ValidationStatus.FAILED:
                laneValidationStatusString = 'Failed'
                break
        }
    }
    
    const releaseStatusOptionReducer = (state, action) => {
        switch (action.type) {
            case "all":
                return { all: action.release_status, specific: {} }
            case "toggle": {
                const { all } = state
                const { id, releaseStatus, readsetsByID } = action
                const newState = { ...state, specific: { ...state.specific } }

                if (all) {
                    if (all !== releaseStatus) {
                        newState.specific[id] = releaseStatus
                    } else {
                        delete newState.specific[id]
                    }
                } else {
                    if (readsetsByID[id]?.release_status !== releaseStatus) {
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
        dispatchReleaseStatusOption({ type: "toggle", id, releaseStatus, readsetsByID })
    }, releaseStatusOption, canReleaseOrBlockFiles)

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
    const specificStatusToggled = Object.keys(releaseStatusOption.specific).length > 0
    const dispatchReleaseStatusOptionTypeAll = (release_status) => {
        dispatchReleaseStatusOption({ type: "all", release_status })
    }

    const extraButtons = <>
        <Button
            style={{ margin: 6 }}
            onClick={() => {
                dispatchReleaseStatusOptionTypeAll(RELEASED)
            }}
            disabled={
                (releaseStatusOption.all === RELEASED || (!releaseStatusOption.all && allFilesReleased)) && !specificStatusToggled
            }>
            Release All
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={() => {
                dispatchReleaseStatusOptionTypeAll(BLOCKED)
            }}
            disabled={
                (releaseStatusOption.all === BLOCKED || (!releaseStatusOption.all && allFilesBlocked)) && !specificStatusToggled
            }>
            Block All
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={() => {
                dispatchReleaseStatusOptionTypeAll(undefined)
            }}
            disabled={!releaseStatusOption.all && !specificStatusToggled}>
            Undo Changes
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={() => {
                const { all, specific } = releaseStatusOption
                if (all) {
                    dispatch(setReleaseStatus(dataset?.id, all, Object.keys(specific), filters))
                } else {
                    Object.entries(specific).forEach(([id, release_status]) => {
                        const rs = readsetsByID[id];
                        rs.release_status = release_status
                        dispatch(update(rs))
                    })
                }
                dispatchReleaseStatusOptionTypeAll(undefined)
            }}
            type={"primary"}
            disabled={!releaseStatusOption.all && !specificStatusToggled}>
            Save Changes
        </Button>
    </>
    return <>
        <AppPageHeader title="Readsets" />
        <PageContent>
            {/* <FilterPanel
                descriptions={[]}
                filters={filters}
                setFilter={readsetTableCallbacks.setFilterCallback}
                setFilterOption={readsetTableCallbacks.setFilterOptionsCallback}
            /> */}
            {/* <FiltersBar filters={filters} clearFilters={readsetTableCallbacks.clearFiltersCallback} /> */}
            { extraButtons }
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