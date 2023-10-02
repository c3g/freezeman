import React, { useEffect, useReducer, useState } from "react"
import AppPageHeader from "../AppPageHeader"
import PageContent from "../PageContent"
import ReadsetTableActions from "../../modules/readsetsTable/actions"
import PagedItemsTable from "../pagedItemsTable/PagedItemsTable";
import FilterPanel from "../filters/filterPanel/FilterPanel";
import FiltersBar from "../filters/filtersBar/FiltersBar";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectReadsetsByID, selectReadsetsTable } from "../../selectors";
import { BLOCKED, ObjectWithReadset, READSET_COLUMN_DEFINITIONS, READSET_COLUMN_FILTERS, READSET_FILTER_KEYS, RELEASED, ReadsetColumnID } from "./ReadsetsTableColumns";
import { Dataset, Readset } from "../../models/frontend_models";
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks";
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns";
import { useItemsByIDToDataObjects } from '../pagedItemsTable/useItemsByIDToDataObjects'
import { Button, Tooltip } from "antd";
import { ValidationStatus } from "../../modules/experimentRunLanes/models";
import { MinusCircleTwoTone, PlusCircleTwoTone } from "@ant-design/icons";
import { createFixedFilter } from "../../models/paged_items";
import { FILTER_TYPE } from "../../constants";
import { setColumnWidths } from "../pagedItemsTable/tableColumnUtilities";
import { setReleaseStatusAll } from "../../modules/datasets/actions";
import { setReleaseStatus } from "../../modules/readsets/actions";
import { FMSId } from "../../models/fms_api_models"



interface ReadsetsListContentProps {
    dataset?: Dataset
    laneValidationStatus?: ValidationStatus
}

const wrapReadset = (readset: Readset): ObjectWithReadset => {
    return { readset }
}
const ReadsetsListContent = ({ dataset, laneValidationStatus }: ReadsetsListContentProps) => {
    const readsetsByID = useAppSelector(selectReadsetsByID)
    const readsetTableState = useAppSelector(selectReadsetsTable)
    const readsetTableCallbacks = usePagedItemsActionsCallbacks(ReadsetTableActions)
    const dispatch = useAppDispatch()
    const { filters, totalCount } = readsetTableState

    const allFilesReleased = dataset?.released_status_count === totalCount
    const allFilesBlocked = dataset?.blocked_status_count === totalCount


    // For this table, there is a single PagedItems redux state. We need to reset the paged items
    // state whenever a new dataset is selected by the user. This component keeps track of the
    // last dataset that was loaded so that it can detect when it has received a new dataset
    // and has to flush the state.
    const [lastDatasetID, setLastDatasetID] = useState<FMSId>()
    const currentDatasetID = dataset?.id
    useEffect(() => {
        
        if (currentDatasetID) {
            if (currentDatasetID !== lastDatasetID) {
                setLastDatasetID(currentDatasetID)
                dispatch(ReadsetTableActions.resetPagedItems())
                dispatch(ReadsetTableActions.setFixedFilter(createFixedFilter(FILTER_TYPE.INPUT_OBJECT_ID, 'dataset__id', String(currentDatasetID))))
                dispatch(ReadsetTableActions.listPage(1))
            }
        }
    }, [dispatch, currentDatasetID])

    const canReleaseOrBlockFiles = (laneValidationStatus === ValidationStatus.PASSED || laneValidationStatus === ValidationStatus.FAILED)

    const releaseStatusOptionReducer = (state, action) => {
        switch (action.type) {
            case "all":
                return { all: action.release_status, specific: {} }
            case "toggle": {
                const { all } = state
                const { id, releaseStatus } = action
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
    const checkIfDecimal = (str) => {
        const num = parseFloat(str)
        if (String(num).includes('.')) {
            return num.toFixed(3)
        } else {
            return num
        }
    }
    const columnDefinitions = READSET_COLUMN_DEFINITIONS((id, releaseStatus) => {
        dispatchReleaseStatusOption({ type: "toggle", id, releaseStatus, readsetsByID })
    }, releaseStatusOption, canReleaseOrBlockFiles)

    let readsetTableColumns = [
        columnDefinitions.ID,
        columnDefinitions.SAMPLE_NAME,
        columnDefinitions.RELEASE_STATUS,
        columnDefinitions.LIBRARY_TYPE,
        columnDefinitions.INDEX,
        columnDefinitions.NUMBER_READS,
    ]
    readsetTableColumns = setColumnWidths(
        readsetTableColumns,
        {
            [ReadsetColumnID.ID]: 10,
            [ReadsetColumnID.SAMPLE_NAME]: 10,
            [ReadsetColumnID.RELEASE_STATUS]: 10,
            [ReadsetColumnID.LIBRARY_TYPE]: 10,
            [ReadsetColumnID.INDEX]: 10,
            [ReadsetColumnID.NUMBER_READS]: 10,
        }

    )
    const columns = useFilteredColumns(
        readsetTableColumns,
        READSET_COLUMN_FILTERS,
        READSET_FILTER_KEYS,
        filters,
        readsetTableCallbacks.setFilterCallback,
        readsetTableCallbacks.setFilterOptionsCallback
    )


    const mapContainerIDs = useItemsByIDToDataObjects(selectReadsetsByID, wrapReadset)
    const statusToggled = Object.keys(releaseStatusOption.specific).length > 0
    const dispatchReleaseStatusOptionTypeAll = (release_status) => {
        dispatchReleaseStatusOption({ type: "all", release_status })
    }

    const extraButtons = <div>
        <Button
            style={{ margin: 6 }}
            onClick={() => {
                dispatchReleaseStatusOptionTypeAll(RELEASED)
            }}
            disabled={
                (!canReleaseOrBlockFiles || (releaseStatusOption.all === RELEASED || (!releaseStatusOption.all && allFilesReleased)) && !statusToggled)
            }>
            Release All
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={() => {
                dispatchReleaseStatusOptionTypeAll(BLOCKED)
            }}
            disabled={
                (!canReleaseOrBlockFiles || (releaseStatusOption.all === BLOCKED || (!releaseStatusOption.all && allFilesBlocked)) && !statusToggled)
            }>
            Block All
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={() => {
                dispatchReleaseStatusOptionTypeAll(undefined)
            }}
            disabled={!releaseStatusOption.all && !statusToggled}>
            Undo Changes
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={() => {
                const { all, specific } = releaseStatusOption
                if (all) {
                    dispatch(setReleaseStatusAll(dataset?.id, all, Object.keys(specific), filters, ReadsetTableActions.refreshPage()))
                } else {
                    Object.entries(specific).forEach(([id, release_status]) => {
                        dispatch(setReleaseStatus(id, release_status, ReadsetTableActions.refreshPage()))
                    })
                }
                dispatchReleaseStatusOptionTypeAll(undefined)
            }}
            type={"primary"}
            disabled={!releaseStatusOption.all && !statusToggled}>
            Save Changes
        </Button>
    </div>

    return <div>
        <AppPageHeader title="Readsets" />
        <PageContent>
            {Object.keys(filters).length > 0 &&
                <FilterPanel
                    descriptions={[]}
                    filters={filters}
                    setFilter={readsetTableCallbacks.setFilterCallback}
                    setFilterOption={readsetTableCallbacks.setFilterOptionsCallback}
                />
            }
            <div style={{
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                {extraButtons}
                <FiltersBar filters={filters} clearFilters={readsetTableCallbacks.clearFiltersCallback} />
            </div>
            <PagedItemsTable<ObjectWithReadset>
                columns={columns}
                expandable={{
                    columnTitle: () => <div>View Metrics</div>,
                    expandIcon: ({ expanded, onExpand, record }) =>
                        expanded ? (
                            <Tooltip title="Hide Metrics">
                                <MinusCircleTwoTone onClick={e => onExpand(record, e)} />
                            </Tooltip>
                        ) : (
                            <Tooltip title="View Metrics">
                                <PlusCircleTwoTone onClick={e => onExpand(record, e)} />
                            </Tooltip>

                        )
                    ,
                    expandedRowRender: (record) => {
                        const readset: Readset = record.readset
                        return (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(8,1fr)',
                                gap: '1em'
                            }} key={readset.id}>
                                {
                                    readset.metrics ?
                                        Object.keys(readset.metrics).map(
                                            (name) => {
                                                return (
                                                    readset.metrics && (readset.metrics[name].value_numeric || readset.metrics[name].value_string) &&


                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                    }} key={name}>
                                                        {<b >
                                                            {name.replace(/_/g, " ")}
                                                        </b>
                                                        }
                                                        {readset.metrics[name].value_numeric
                                                            ?
                                                            checkIfDecimal(readset.metrics[name].value_numeric)
                                                            :
                                                            readset.metrics[name].value_string}
                                                    </div>)
                                            })
                                        :
                                        <div>No metrics</div>
                                }
                            </div>
                        )
                    }
                    ,
                }}
                getDataObjectsByID={mapContainerIDs}
                pagedItems={readsetTableState}
                usingFilters={false}
                {...readsetTableCallbacks}
                initialLoad={false}
            />

        </PageContent>
    </div>;
}
export default ReadsetsListContent