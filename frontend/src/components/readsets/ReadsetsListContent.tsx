import React, { useCallback, useEffect, useReducer } from "react"
import AppPageHeader from "../AppPageHeader"
import PageContent from "../PageContent"
import ReadsetTableActions from "../../modules/readsetsTable/actions"
import PagedItemsTable from "../pagedItemsTable/PagedItemsTable";
import FilterPanel from "../filters/filterPanel/FilterPanel";
import FiltersBar from "../filters/filtersBar/FiltersBar";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectReadsetsByID, selectReadsetsTable } from "../../selectors";
import { ObjectWithReadset, READSET_COLUMN_DEFINITIONS, READSET_COLUMN_FILTERS, READSET_FILTER_KEYS, ReadsetColumnID } from "./ReadsetsTableColumns";
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
import produce, { Draft } from "immer";
import { ReleaseStatusOptionAction, ReleaseStatusOptionActionToggle, ReleaseStatusOptionState } from "./interface";
import { ReleaseStatus } from "../../models/fms_api_models";

interface ReadsetsListContentProps {
    dataset: Dataset
    laneValidationStatus: ValidationStatus
}

const wrapReadset = (readset: Readset): ObjectWithReadset => {
    return { readset }
}

const ReadsetsListContent = ({ dataset, laneValidationStatus }: ReadsetsListContentProps) => {
    const readsetsByID = useAppSelector(selectReadsetsByID)
    const readsetTableState = useAppSelector(selectReadsetsTable)
    const readsetTableCallbacks = usePagedItemsActionsCallbacks(ReadsetTableActions)
    const dispatch = useAppDispatch()
    const { filters, totalCount: totalReadsets } = readsetTableState

    const allReadsetsAlreadyReleased = dataset.released_status_count === totalReadsets
    const allReadsetsAlreadyBlocked = dataset.blocked_status_count === totalReadsets

    // For this table, there is a single PagedItems redux state. We need to reset the paged items
    // state whenever a new dataset is selected by the user. This component keeps track of the
    // last dataset that was loaded so that it can detect when it has received a new dataset
    // and has to flush the state.
    useEffect(() => {
        dispatch(ReadsetTableActions.resetPagedItems())
        dispatch(ReadsetTableActions.setFixedFilter(createFixedFilter(FILTER_TYPE.INPUT_OBJECT_ID, 'dataset__id', dataset.id.toString())))
        dispatch(ReadsetTableActions.listPage(1))
    }, [dataset.id, dispatch])

    const canReleaseOrBlockReadsets = (laneValidationStatus === ValidationStatus.PASSED || laneValidationStatus === ValidationStatus.FAILED)

    const releaseStatusOptionReducer = useReleaseStatusOptionReducer(readsetsByID)
    const [releaseStatusOption, dispatchReleaseStatusOption] = useReducer(
        releaseStatusOptionReducer,
        {
            all: undefined,
            specific: {},
        }
    )

    const columnDefinitions = READSET_COLUMN_DEFINITIONS((action: ReleaseStatusOptionActionToggle) => {
        dispatchReleaseStatusOption(action)
    }, releaseStatusOption, canReleaseOrBlockReadsets)

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

    const extraButtons = <div>
        <Button
            style={{ margin: 6 }}
            onClick={() => {
                dispatchReleaseStatusOption({ type: "all", releaseStatus: ReleaseStatus.RELEASED })
            }}
            disabled={
                (
                    !canReleaseOrBlockReadsets ||
                    // if release all and nothing is toggled manually
                    (releaseStatusOption.all === ReleaseStatus.RELEASED && !statusToggled) ||
                    (releaseStatusOption.all === undefined && allReadsetsAlreadyReleased)
                )
            }>
            Release All
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={() => {
                dispatchReleaseStatusOption({ type: "all", releaseStatus: ReleaseStatus.BLOCKED })
            }}
            disabled={
                (
                    !canReleaseOrBlockReadsets ||
                    // if block all and nothing is toggled manually
                    (releaseStatusOption.all === ReleaseStatus.BLOCKED && !statusToggled) ||
                    (releaseStatusOption.all === undefined && allReadsetsAlreadyBlocked)
                )
            }>
            Block All
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={() => {
                dispatchReleaseStatusOption({ type: "undo-all" })
            }}
            disabled={releaseStatusOption.all === undefined && !statusToggled}>
            Undo Changes
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={() => {
                const { all, specific } = releaseStatusOption
                // reset options for new readset table state
                dispatchReleaseStatusOption({ type: "undo-all" })
                if (all) {
                    dispatch(setReleaseStatusAll(dataset?.id, all, Object.keys(specific), filters, ReadsetTableActions.refreshPage()))
                } else {
                    for (const [id, release_status] of Object.entries(specific)) {
                        if (release_status) {
                            dispatch(setReleaseStatus(id, release_status, ReadsetTableActions.refreshPage()))
                        }
                    }
                }
            }}
            type={"primary"}
            disabled={releaseStatusOption.all === undefined && !statusToggled}>
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
                    columnTitle: <div>View Metrics</div>,
                    expandIcon: ({ expanded, onExpand, record }) =>
                        expanded ? (
                            <Tooltip title="Hide Metrics">
                                <MinusCircleTwoTone style={{fontSize: 18}} onClick={e => onExpand(record, e)} />
                            </Tooltip>
                        ) : (
                            <Tooltip title="View Metrics">
                                <PlusCircleTwoTone style={{fontSize: 18}} onClick={e => onExpand(record, e)} />
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

function useReleaseStatusOptionReducer(readsetsByID: Record<Readset['id'], Readset | undefined>) {
    return useCallback((state: ReleaseStatusOptionState, action: ReleaseStatusOptionAction) => {
        return produce(state, (state: Draft<ReleaseStatusOptionState>) => {
            switch (action.type) {
                case "all": {
                    state.all = action.releaseStatus
                    state.specific = {}
                    break
                }
                case "toggle": {
                    const { all } = state
                    const { id, releaseStatus } = action
                    const currentReleaseStatus = readsetsByID[id]?.release_status

                    if (all) {
                        if (all !== releaseStatus) {
                            // set specific to opposite of all
                            state.specific[id] = releaseStatus
                        } else {
                            // merge with all
                            delete state.specific[id]
                        }
                    } else if (currentReleaseStatus && currentReleaseStatus !== releaseStatus) {
                        // set specific to opposite of current
                        state.specific[id] = releaseStatus
                    }

                    break
                }
                case "undo-all": {
                    state.all = undefined
                    state.specific = {}
                    break
                }
            }
        })
    }, [readsetsByID])
}

function checkIfDecimal(str: string) {
    const num = parseFloat(str)
    if (String(num).includes('.')) {
        return num.toFixed(3)
    } else {
        return num
    }
}

export default ReadsetsListContent