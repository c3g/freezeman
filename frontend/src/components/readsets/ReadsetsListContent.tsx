import React, { useCallback, useEffect, useMemo, useReducer } from "react"
import AppPageHeader from "../AppPageHeader"
import PageContent from "../PageContent"
import ReadsetTableActions from "../../modules/readsetsTable/actions"
import PagedItemsTable, { PagedItemsActionsCallbacks } from "../pagedItemsTable/PagedItemsTable";
import FilterPanel from "../filters/filterPanel/FilterPanel";
import FiltersBar from "../filters/filtersBar/FiltersBar";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectReadsetsByID, selectReadsetsTable } from "../../selectors";
import { ObjectWithReadset, useReadsetColumnDefinitions, READSET_COLUMN_FILTERS, READSET_FILTER_KEYS, ReadsetColumnID } from "./ReadsetsTableColumns";
import { Dataset, Readset } from "../../models/frontend_models";
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks";
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns";
import { useItemsByIDToDataObjects } from '../pagedItemsTable/useItemsByIDToDataObjects'
import { Button, Tooltip } from "antd";
import { ValidationStatus } from "../../modules/experimentRunLanes/models";
import { MinusCircleTwoTone, PlusCircleTwoTone } from "@ant-design/icons";
import { createFixedFilter, FilterSet } from "../../models/paged_items";
import { FILTER_TYPE } from "../../constants";
import { setColumnWidths } from "../pagedItemsTable/tableColumnUtilities";
import { setReleaseStatusAll } from "../../modules/datasets/actions";
import { setReleaseStatus } from "../../modules/readsets/actions";
import produce, { Draft } from "immer";
import { ReleaseStatus } from "../../models/fms_api_models";
import { ExpandableConfig } from "antd/lib/table/interface";

const RELEASE_STATUS_STRING = {
    [ReleaseStatus.RELEASED]: 'Released',
    [ReleaseStatus.BLOCKED]: 'Blocked',
    [ReleaseStatus.AVAILABLE]: 'Available',
} as const
const OPPOSITE_STATUS = {
    [ReleaseStatus.AVAILABLE]: ReleaseStatus.RELEASED,
    [ReleaseStatus.RELEASED]: ReleaseStatus.BLOCKED,
    [ReleaseStatus.BLOCKED]: ReleaseStatus.RELEASED,
} as const

interface ReadsetsListContentProps {
    dataset: Dataset
    laneValidationStatus: ValidationStatus
}

const ReadsetsListContent = ({ dataset, laneValidationStatus }: ReadsetsListContentProps) => {
    const readsetTableState = useAppSelector(selectReadsetsTable)
    const readsetTableCallbacks = usePagedItemsActionsCallbacks(ReadsetTableActions)
    const dispatch = useAppDispatch()
    const { filters, totalCount: totalReadsets } = readsetTableState

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

    const releaseStatusOptionReducer = useReleaseStatusOptionReducer(totalReadsets)
    const [releaseStatusOption, dispatchReleaseStatusOption] = useReducer(
        releaseStatusOptionReducer,
        {
            all: undefined,
            specific: {},
        }
    )

    const renderReleaseStatus = useCallback((_: any, { readset }: ObjectWithReadset) => (
        <ReleaseStatusButton readset={readset} releaseStatusOption={releaseStatusOption} disabled={!canReleaseOrBlockReadsets}
            onClick={() => {
                const { id } = readset
                dispatchReleaseStatusOption({ type: "toggle", id })
            }}
        />
    ), [canReleaseOrBlockReadsets, releaseStatusOption])
    const columns = useColumns(filters, readsetTableCallbacks, renderReleaseStatus)

    const expandableMetricConfig = useExpandableMetricConfig()

    const extraButtons = useMemo(() => {
        const allReadsetsAlreadyReleased = dataset.released_status_count === totalReadsets
        const allReadsetsAlreadyBlocked = dataset.blocked_status_count === totalReadsets
        const statusToggled = Object.keys(releaseStatusOption.specific).length > 0

        const saveChangesEnabled = releaseStatusOption.all !== undefined || Object.keys(releaseStatusOption.specific).length === totalReadsets
    
        return <div>
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
                        // if not all set and all readsets are already released
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
                        // if not all set and all readsets are already blocked
                        (releaseStatusOption.all === undefined && allReadsetsAlreadyBlocked)
                    )
                }>
                Block All
            </Button>
            <Button
                style={{ margin: 6 }}
                onClick={() => {
                    dispatchReleaseStatusOption({ type: "undo-changes" })
                }}
                disabled={
                    // if already in default state
                    releaseStatusOption.all === undefined && !statusToggled
                }>
                Undo Changes
            </Button>
            <Button
                style={{ margin: 6 }}
                onClick={() => {
                    const { all, specific } = releaseStatusOption
                    // reset options for new readset table state
                    dispatchReleaseStatusOption({ type: "undo-changes" })
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
                disabled={!saveChangesEnabled}>
                Save Changes
            </Button>
        </div>
    },
    [canReleaseOrBlockReadsets, dataset.blocked_status_count, dataset?.id, dataset.released_status_count, dispatch, filters, releaseStatusOption, totalReadsets])

    const mapContainerIDs = useItemsByIDToDataObjects(selectReadsetsByID, wrapReadset)

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
                expandable={expandableMetricConfig}
                getDataObjectsByID={mapContainerIDs}
                pagedItems={readsetTableState}
                usingFilters={false}
                {...readsetTableCallbacks}
                initialLoad={false}
            />
        </PageContent>
    </div>
}

export default ReadsetsListContent

function useReleaseStatusOptionReducer(totalReadsets: number) {
    const readsetsByID = useAppSelector((state) => selectReadsetsByID(state))
    return useCallback((state: ReleaseStatusState, action: ReleaseStatusOptionAction) => {
        return produce(state, (state: Draft<ReleaseStatusState>) => {
            switch (action.type) {
                case "all": {
                    state.all = action.releaseStatus
                    state.specific = {}
                    break
                }
                case "toggle": {
                    const { all } = state
                    const readsetID = action.id
                    const specificNewReleaseStatus = state.specific[readsetID]

                    if (all) {
                        if (specificNewReleaseStatus) {
                            // merge with all
                            delete state.specific[readsetID]
                        } else {
                            // set specific to opposite of all
                            state.specific[readsetID] = OPPOSITE_STATUS[all]
                        }
                    } else {
                        if (specificNewReleaseStatus) {
                            // typical toggle release state
                            state.specific[readsetID] = OPPOSITE_STATUS[specificNewReleaseStatus]
                        } else {
                            // user clicked on the button for the first time
                            state.specific[readsetID] = OPPOSITE_STATUS[readsetsByID[readsetID]?.release_status ?? ReleaseStatus.AVAILABLE]
                        }
                    }

                    break
                }
                case "undo-changes": {
                    state.all = undefined
                    state.specific = {}
                    break
                }
            }

            let totalReleasedReadsets = 0
            let totalBlockedReadsets = 0
            for (const readsetID in state.specific) {
                const releaseStatus = state.specific[readsetID]
                if (releaseStatus === ReleaseStatus.RELEASED) {
                    totalReleasedReadsets++
                } else if (releaseStatus === ReleaseStatus.BLOCKED) {
                    totalBlockedReadsets++
                }
            }
            if (totalReleasedReadsets === totalReadsets) {
                state.all = ReleaseStatus.RELEASED
                state.specific = {}
            } else if (totalBlockedReadsets === totalReadsets) {
                state.all = ReleaseStatus.BLOCKED
                state.specific = {}
            }
        })
    }, [readsetsByID, totalReadsets])
}

function useColumns(filters: FilterSet, readsetTableCallbacks: PagedItemsActionsCallbacks, renderReleaseStatus: (value: any, record: ObjectWithReadset, index: number) => React.JSX.Element) {
    const columnDefinitions = useReadsetColumnDefinitions({
        renderReleaseStatus
    })

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

    return columns
}

function useExpandableMetricConfig(): ExpandableConfig<ObjectWithReadset> {
    return useMemo(() => ({
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
    }), [])
}

interface ReleaseStatusButtonProps {
    readset: Readset
    releaseStatusOption: ReleaseStatusState
    disabled: boolean
    onClick: React.MouseEventHandler<HTMLElement>
}
function ReleaseStatusButton({ readset, releaseStatusOption, disabled, onClick }: ReleaseStatusButtonProps) {
    const { id } = readset;
    const newReleaseStatus = releaseStatusOption.specific[id] ?? releaseStatusOption.all
    const changed = newReleaseStatus !== undefined && newReleaseStatus !== readset.release_status
    return (readset &&
        <Button
            disabled={disabled}
            style={{
                color: changed && newReleaseStatus ? (newReleaseStatus === ReleaseStatus.RELEASED ? "green" : "red") : "grey",
                width: "6em"
            }}
            onClick={onClick}
        >
            {newReleaseStatus ? RELEASE_STATUS_STRING[newReleaseStatus] : RELEASE_STATUS_STRING[readset.release_status]}
        </Button>
    )
}

function checkIfDecimal(str: string) {
    const num = parseFloat(str)
    if (String(num).includes('.')) {
        return num.toFixed(3)
    } else {
        return num
    }
}

function wrapReadset(readset: Readset): ObjectWithReadset {
    return { readset }
}

interface ReleaseStatusState {
    all: ReleaseStatus.RELEASED | ReleaseStatus.BLOCKED | undefined
    specific: Record<Readset['id'], ReleaseStatus.RELEASED | ReleaseStatus.BLOCKED | undefined>
}

interface ReleaseStatusActionAll {
    type: "all"
    releaseStatus: ReleaseStatus.RELEASED | ReleaseStatus.BLOCKED
}
interface ReleaseStatusActionToggle {
    type: "toggle"
    id: Readset['id']
}
interface ReleaseStatusActionUndoChanges {
    type: "undo-changes"
}
type ReleaseStatusOptionAction =
    | ReleaseStatusActionAll
    | ReleaseStatusActionToggle
    | ReleaseStatusActionUndoChanges