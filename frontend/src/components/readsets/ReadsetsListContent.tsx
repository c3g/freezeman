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

    const canReleaseOrBlockReadsets = (laneValidationStatus === ValidationStatus.PASSED || laneValidationStatus === ValidationStatus.FAILED)

    const releaseStatusManager = useReleaseStatusManager(dataset.id)

    const renderReleaseStatus = useCallback((_: any, { readset }: ObjectWithReadset) => (
        <ReleaseStatusButton releaseStatus={releaseStatusManager.readsetReleaseStates[readset.id]} disabled={!canReleaseOrBlockReadsets}
            onClick={() => {
                const { id } = readset
                releaseStatusManager.toggleReleaseStatus(id)
            }}
        />
    ), [canReleaseOrBlockReadsets, releaseStatusManager])
    const columns = useColumns(filters, readsetTableCallbacks, renderReleaseStatus)

    const expandableMetricConfig = useExpandableMetricConfig()

    const extraButtons = useMemo(() => {
        const allReadsetsReleased = Object.values(releaseStatusManager.readsetReleaseStates).every(status =>
            status?.new ? status.new === ReleaseStatus.RELEASED : status?.old === ReleaseStatus.RELEASED
        )
        const allReadsetsBlocked = Object.values(releaseStatusManager.readsetReleaseStates).every(status =>
            status?.new ? status.new === ReleaseStatus.BLOCKED : status?.old === ReleaseStatus.BLOCKED
        )
        const saveChangesEnabled = Object.values(releaseStatusManager.readsetReleaseStates).some(status => status?.new !== undefined)
    
        return <div>
            <Button
                style={{ margin: 6 }}
                onClick={() => {
                    releaseStatusManager.setAllReleaseStatus(ReleaseStatus.RELEASED)
                }}
                disabled={allReadsetsReleased}>
                Release All
            </Button>
            <Button
                style={{ margin: 6 }}
                onClick={() => {
                    releaseStatusManager.setAllReleaseStatus(ReleaseStatus.BLOCKED)
                }}
                disabled={allReadsetsBlocked}>
                Block All
            </Button>
            <Button
                style={{ margin: 6 }}
                onClick={() => {
                    releaseStatusManager.undoChanges()
                }}
                disabled={saveChangesEnabled}>
                Undo Changes
            </Button>
            <Button
                style={{ margin: 6 }}
                onClick={() => {
                    releaseStatusManager.updateReleaseStatus(filters)
                }}
                type={"primary"}
                disabled={!saveChangesEnabled}>
                Save Changes
            </Button>
        </div>
    },
    [filters, releaseStatusManager])

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

function useReleaseStatusManager(datasetID: Dataset["id"]) {
    const [readsetReleaseStates, setReadsetReleaseStates] = useState<
        Record<Readset["id"],
        {
            old: ReleaseStatus,
            new: ReleaseStatus.RELEASED | ReleaseStatus.BLOCKED | undefined
        } | undefined
    >>({})
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

    const setAllReleaseStatus = useCallback((releaseStatus: ReleaseStatus.RELEASED | ReleaseStatus.BLOCKED) => {
        setReadsetReleaseStates(produce((prev) => {
            for (const key in prev) {
                prev[key] = { old: prev[key]?.old ?? ReleaseStatus.AVAILABLE, new: releaseStatus }
            }
        }))
    }, [])

    const toggleReleaseStatus = useCallback((id: Readset["id"]) => {
        setReadsetReleaseStates(produce((prev) => {
            const currentStatus = prev[id]?.new ?? prev[id]?.old ?? ReleaseStatus.AVAILABLE
            prev[id] = { old: currentStatus, new: OPPOSITE_STATUS[currentStatus] }
        }))
    }, [])

    const undoChanges = useCallback(() => {
        setReadsetReleaseStates(produce((prev) => {
            for (const key in prev) {
                const releaseStatus = prev[key]
                if (releaseStatus) {
                    releaseStatus.new = undefined
                }
            }
        }))
    }, [])

    const updateReleaseStatus = useCallback(async (filters: any) => {
        const finalReleaseStates: Record<Readset["id"], ReleaseStatus.RELEASED | ReleaseStatus.BLOCKED> = {}
        for (const key in readsetReleaseStates) {
            const newReleaseStatus = readsetReleaseStates[key]?.new
            const oldReleaseStatus = readsetReleaseStates[key]?.old
            if (
                newReleaseStatus !== undefined &&
                oldReleaseStatus !== undefined &&
                newReleaseStatus !== oldReleaseStatus
            ) {
                finalReleaseStates[key] = newReleaseStatus
            }
        }
        await dispatch(api.datasets.setReleaseStatus(datasetID, finalReleaseStates, filters))
        await dispatch(ReadsetTableActions.refreshPage())
        for (const key in finalReleaseStates) {
            setReadsetReleaseStates(produce((prev) => {
                prev[key] = {
                    old: finalReleaseStates[key],
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
    releaseStatus: ReturnType<typeof useReleaseStatusManager>["readsetReleaseStates"][Readset["id"]]
    disabled: boolean
    onClick: React.MouseEventHandler<HTMLElement>
}
function ReleaseStatusButton({ releaseStatus, disabled, onClick }: ReleaseStatusButtonProps) {
    const newReleaseStatus = releaseStatus?.new
    const oldReleaseStatus = releaseStatus?.old
    return (oldReleaseStatus !== undefined ? <Button
            disabled={disabled}
            style={{
                color: newReleaseStatus != oldReleaseStatus && newReleaseStatus !== undefined
                    ? (newReleaseStatus === ReleaseStatus.RELEASED
                        ? "green"
                        : "red")
                    : "grey",
                width: "6em"
            }}
            onClick={onClick}
        >
            {newReleaseStatus ? RELEASE_STATUS_STRING[newReleaseStatus] : RELEASE_STATUS_STRING[oldReleaseStatus]}
        </Button> : <Spin />)
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
