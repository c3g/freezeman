import React, { useCallback, useEffect, useMemo, useState } from "react"
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
import { Button, Spin, Tooltip } from "antd";
import { ValidationStatus } from "../../modules/experimentRunLanes/models";
import { MinusCircleTwoTone, PlusCircleTwoTone } from "@ant-design/icons";
import { createFixedFilter, FilterSet } from "../../models/paged_items";
import { FILTER_TYPE } from "../../constants";
import { setColumnWidths } from "../pagedItemsTable/tableColumnUtilities";
import { ReleaseStatus } from "../../models/fms_api_models";
import { ExpandableConfig } from "antd/lib/table/interface";
import api from "../../utils/api";
import produce from "immer";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import serializeFilterParamsWithDescriptions from "../pagedItemsTable/serializeFilterParamsTS";

const RELEASE_STATUS_STRING = {
    [ReleaseStatus.RELEASED]: 'Released',
    [ReleaseStatus.BLOCKED]: 'Blocked',
    [ReleaseStatus.AVAILABLE]: 'Available',
} as const
const NEW_RELEASE_STATUS_COLOR = {
    [ReleaseStatus.RELEASED]: 'green',
    [ReleaseStatus.BLOCKED]: 'red',
    [ReleaseStatus.AVAILABLE]: 'lightsalmon',
} as const
const OPPOSITE_STATUS = {
    [ReleaseStatus.AVAILABLE]: ReleaseStatus.RELEASED,
    [ReleaseStatus.RELEASED]: ReleaseStatus.BLOCKED,
    [ReleaseStatus.BLOCKED]: ReleaseStatus.RELEASED,
} as const
const OPPOSITE_STATUS_WITH_AVAILABLE = {
    [ReleaseStatus.AVAILABLE]: ReleaseStatus.RELEASED,
    [ReleaseStatus.RELEASED]: ReleaseStatus.BLOCKED,
    [ReleaseStatus.BLOCKED]: ReleaseStatus.AVAILABLE,
} as const

interface ReadsetsListContentProps {
    dataset: Dataset
    laneValidationStatus: ValidationStatus
    refreshDataset: () => Promise<void>
}

const ReadsetsListContent = ({ dataset, laneValidationStatus, refreshDataset }: ReadsetsListContentProps) => {
    const user = useCurrentUser()
    const isAdmin = user ? user.is_staff : false

    const readsetTableState = useAppSelector(selectReadsetsTable)
    const readsetTableCallbacks = usePagedItemsActionsCallbacks(ReadsetTableActions)
    const dispatch = useAppDispatch()
    const { filters } = readsetTableState

    // For this table, there is a single PagedItems redux state. We need to reset the paged items
    // state whenever a new dataset is selected by the user. This component keeps track of the
    // last dataset that was loaded so that it can detect when it has received a new dataset
    // and has to flush the state.
    useEffect(() => {
        dispatch(ReadsetTableActions.resetPagedItems())
        dispatch(ReadsetTableActions.setFixedFilter(createFixedFilter(FILTER_TYPE.INPUT_OBJECT_ID, 'dataset__id', dataset.id.toString())))
        dispatch(ReadsetTableActions.listPage(1))
    }, [dataset.id, dispatch])

    const canUpdateReleaseStatus =
        (!dataset.latest_release_update && (laneValidationStatus === ValidationStatus.PASSED || laneValidationStatus === ValidationStatus.FAILED)) ||
        ( dataset.latest_release_update && isAdmin)

    const releaseStatusManager = useReleaseStatusManager(dataset.id, filters, isAdmin)

    const renderReleaseStatus = useCallback((_: any, { readset }: ObjectWithReadset) => {
        const readsetStatus = releaseStatusManager.readsetReleaseStates[readset.id]
        if (readsetStatus) {
            return <ReleaseStatusButton 
                readsetStatus={readsetStatus}
                disabled={!canUpdateReleaseStatus}
                onClick={() => {
                    const { id } = readset
                    releaseStatusManager.toggleReleaseStatus(id)
                }}
            />
        } else {
            return <Spin />
        }
    }, [canUpdateReleaseStatus, releaseStatusManager])
    const columns = useColumns(filters, readsetTableCallbacks, renderReleaseStatus)

    const expandableMetricConfig = useExpandableMetricConfig()

    const extraButtons = useMemo(() => {
        const readsetStates = Object.values(releaseStatusManager.readsetReleaseStates).reduce<NonNullable<ReleaseStatusManagerState[Readset["id"]]>[]>((readsetStates, readsetState) =>  {
            if (readsetState) {
                readsetStates.push(readsetState)
            }
            return readsetStates
        }, [])

        const allReadsetsReleased =          readsetStates.every((readsetState) => getCurrentReleaseStatus(readsetState) === ReleaseStatus.RELEASED)
        const allReadsetsBlocked =           readsetStates.every((readsetState) => getCurrentReleaseStatus(readsetState) === ReleaseStatus.BLOCKED)
        const allReadsetsAvailable =         readsetStates.every((readsetState) => getCurrentReleaseStatus(readsetState) === ReleaseStatus.AVAILABLE)
        const allReadsetsReleasedOrBlocked = readsetStates.every((readsetState) => getCurrentReleaseStatus(readsetState) !== ReleaseStatus.AVAILABLE)
        const someReadsetsChangedStatus = readsetStates.some((readsetState) => readsetState.new !== undefined)

        const releaseAllEnabled =             canUpdateReleaseStatus && !allReadsetsReleased      
        const blockAllEnabled =               canUpdateReleaseStatus && !allReadsetsBlocked       
        const undoAllReleaseAndBlockEnabled = canUpdateReleaseStatus && !allReadsetsAvailable && isAdmin
        const undoChangesEnabled =            canUpdateReleaseStatus && someReadsetsChangedStatus 
        const saveChangesEnabled =            canUpdateReleaseStatus && someReadsetsChangedStatus && (allReadsetsReleasedOrBlocked || isAdmin)
    
        return <div>
            <Button
                style={{ margin: 6 }}
                onClick={() => {
                    releaseStatusManager.setAllReleaseStatus(ReleaseStatus.RELEASED)
                }}
                disabled={!releaseAllEnabled}>
                Release All
            </Button>
            <Button
                style={{ margin: 6 }}
                onClick={() => {
                    releaseStatusManager.setAllReleaseStatus(ReleaseStatus.BLOCKED)
                }}
                disabled={!blockAllEnabled}>
                Block All
            </Button>
            <Button
                style={{ margin: 6 }}
                onClick={() => {
                    releaseStatusManager.setAllReleaseStatus(ReleaseStatus.AVAILABLE)
                }}
                disabled={!undoAllReleaseAndBlockEnabled}>
                Undo All Release/Block
            </Button>
            <Button
                style={{ margin: 6 }}
                onClick={() => {
                    releaseStatusManager.undoChanges()
                }}
                disabled={!undoChangesEnabled}>
                Undo Changes
            </Button>
            <Button
                style={{ margin: 6 }}
                onClick={async () => {
                    await releaseStatusManager.updateReleaseStatus()
                    await refreshDataset()
                }}
                type={"primary"}
                disabled={!saveChangesEnabled}>
                Save Changes
            </Button>
        </div>
    },
    [canUpdateReleaseStatus, isAdmin, refreshDataset, releaseStatusManager])

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

function getCurrentReleaseStatus(readsetStatus: NonNullable<ReleaseStatusManagerState[Readset["id"]]>) {
    return readsetStatus.new ?? readsetStatus.old
}

type ReleaseStatusManagerState = Record<
    Readset["id"],
    {
        // the release status before the user has changed the status
        old: ReleaseStatus,
        // the potential new release status that the user has selected
        new: ReleaseStatus | undefined
    } | undefined
>
function useReleaseStatusManager(datasetID: Dataset["id"], filters: FilterSet, allowAvailable: boolean) {
    const [readsetReleaseStates, setReadsetReleaseStates] = useState<ReleaseStatusManagerState>({})
    const [readsetIDs, setReadsetIDs] = useState<Readset["id"][]>([])
    const dispatch = useAppDispatch()

    useEffect(() => {
        dispatch(api.readsets.list({ dataset__id__in: datasetID, limit: 10000 })).then((readsets) => {
            const newReadsetReleaseStates = readsets.data.results.reduce<typeof readsetReleaseStates>((acc, readset) => {
                acc[readset.id] = { old: readset.release_status, new: undefined }
                return acc
            }, {})
            setReadsetReleaseStates(newReadsetReleaseStates)
        })
    }, [datasetID, dispatch])

    useEffect(() => {
        if (Object.keys(readsetReleaseStates).length > 0) {
            const serializedFilters = serializeFilterParamsWithDescriptions({ ...filters })
            dispatch(api.readsets.list({ dataset__id__in: datasetID, ...serializedFilters, limit: 10000 })).then((readsets) => {
                setReadsetIDs(readsets.data.results.map((readset) => readset.id))
            })
        }
    }, [datasetID, filters, dispatch, readsetReleaseStates])

    const setAllReleaseStatus = useCallback((newReleaseStatus: ReleaseStatus) => {
        setReadsetReleaseStates(produce((readsetReleaseStates) => {
            for (const key of readsetIDs) {
                const readsetStatus = readsetReleaseStates[key]
                if (readsetStatus) {
                    readsetStatus.new = readsetStatus.old !== newReleaseStatus
                        ? newReleaseStatus
                        : undefined
                }
            }
        }))
    }, [readsetIDs])

    const toggleReleaseStatus = useCallback((id: Readset["id"]) => {
        setReadsetReleaseStates(produce((readsetReleaseStates) => {
            const readsetStatus = readsetReleaseStates[id]
            if (readsetStatus) {
                const newReleaseStatus = allowAvailable
                    ? OPPOSITE_STATUS_WITH_AVAILABLE[getCurrentReleaseStatus(readsetStatus)]
                    : OPPOSITE_STATUS[getCurrentReleaseStatus(readsetStatus)]
                readsetStatus.new = readsetStatus.old !== newReleaseStatus
                    ? newReleaseStatus
                    : undefined
            }
        }))
    }, [allowAvailable])

    const undoChanges = useCallback(() => {
        setReadsetReleaseStates(produce((readsetReleaseStates) => {
            for (const key in readsetReleaseStates) {
                const releaseStatus = readsetReleaseStates[key]
                if (releaseStatus) {
                    releaseStatus.new = undefined
                }
            }
        }))
    }, [])

    const updateReleaseStatus = useCallback(async () => {
        const finalNewReleaseStates: Record<Readset["id"], ReleaseStatus> = {}
        for (const key in readsetReleaseStates) {
            const readsetStatus = readsetReleaseStates[key]
            if (
                readsetStatus && readsetStatus.new !== undefined
            ) {
                finalNewReleaseStates[key] = readsetStatus.new
            }
        }
        await dispatch(api.datasets.setReleaseStatus(datasetID, finalNewReleaseStates))
        // await dispatch(ReadsetTableActions.refreshPage()) // already updated implicitly by refreshDataset
        for (const key in finalNewReleaseStates) {
            setReadsetReleaseStates(produce((readsetReleaseStates) => {
                readsetReleaseStates[key] = {
                    old: finalNewReleaseStates[key],
                    new: undefined
                }
            }))
        }
    }, [datasetID, dispatch, readsetReleaseStates])

    return useMemo(() => ({
        readsetReleaseStates,
        setAllReleaseStatus,
        toggleReleaseStatus,
        undoChanges,
        updateReleaseStatus,
    }), [readsetReleaseStates, setAllReleaseStatus, toggleReleaseStatus, undoChanges, updateReleaseStatus])
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
    readsetStatus: NonNullable<ReleaseStatusManagerState[Readset["id"]]>
    disabled: boolean
    onClick: React.MouseEventHandler<HTMLElement>
}
function ReleaseStatusButton({ readsetStatus, disabled, onClick }: ReleaseStatusButtonProps) {
    return <Button
            disabled={disabled}
            style={{
                color: readsetStatus.new !== undefined
                    ? NEW_RELEASE_STATUS_COLOR[readsetStatus.new]
                    : "grey",
                width: "6em"
            }}
            onClick={onClick}
            >
                {RELEASE_STATUS_STRING[getCurrentReleaseStatus(readsetStatus)]}
        </Button>
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
