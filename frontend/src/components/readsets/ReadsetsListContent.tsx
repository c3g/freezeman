import React, { useEffect, useReducer } from "react"
import AppPageHeader from "../AppPageHeader"
import PageContent from "../PageContent"
import ReadsetTableActions from "../../modules/readsetsTable/actions"
import PagedItemsTable from "../pagedItemsTable/PagedItemsTable";
import FilterPanel from "../filters/filterPanel/FilterPanel";
import FiltersBar from "../filters/filtersBar/FiltersBar";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectReadsetsByID, selectReadsetsTable } from "../../selectors";
import { BLOCKED, OPPOSITE_STATUS, ObjectWithReadset, READSET_COLUMN_DEFINITIONS, READSET_COLUMN_FILTERS, READSET_FILTER_KEYS, RELEASED, ReadsetColumnID } from "./ReadsetsTableColumns";
import { Dataset, Readset } from "../../models/frontend_models";
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks";
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns";
import { useItemsByIDToDataObjects } from '../pagedItemsTable/useItemsByIDToDataObjects'
import { Button, Tooltip } from "antd";
import { set_release_status } from "../../modules/readsets/actions";
import { ValidationStatus } from "../../modules/experimentRunLanes/models";
import { MinusCircleTwoTone, PlusCircleTwoTone } from "@ant-design/icons";
import { createFixedFilter } from "../../models/paged_items";
import { FILTER_TYPE } from "../../constants";
import { setColumnWidths } from "../pagedItemsTable/tableColumnUtilities";



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

    useEffect(() => {
        if (dataset) {
            dispatch(ReadsetTableActions.resetPagedItems())
            dispatch(ReadsetTableActions.setFixedFilter(createFixedFilter(FILTER_TYPE.INPUT_OBJECT_ID, 'dataset__id', String(dataset?.id))))
            dispatch(ReadsetTableActions.listPage(1))
            dispatchReleaseStatusOption({type: "all"})
        }
    }, [dataset?.id, dispatch])

    const canReleaseOrBlockFiles = (laneValidationStatus === ValidationStatus.PASSED || laneValidationStatus === ValidationStatus.FAILED)

    const releaseStatusOptionReducer = (state, action) => {
        switch (action.type) {
            case "clear":
                return { readsetIds: {}, all: '' }
            case "toggle": {

                const { id, releaseStatus, readsetsByID } = action
                const newState = { ...state, readsetIds: { ...state.readsetIds } }

                if (readsetsByID[id]?.release_status !== releaseStatus) {
                    newState.readsetIds[id] = releaseStatus
                } else {
                    delete newState.readsetIds[id]
                }
                return newState
            }
            case "all": {
                const newState = {...state}
                newState.all = dataset?.released_status_count === totalCount ? 1 : (dataset?.blocked_status_count === totalCount ? 2 : 0)
                return newState
            }
        }
    }

    const [releaseStatusOption, dispatchReleaseStatusOption] = useReducer(
        releaseStatusOptionReducer,
        {
            readsetIds: {},
            all: 0
        }
    )
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
        // columnDefinitions.NUM_BASES,
        // columnDefinitions.MEAN_QUALITY_SCORE,
        // columnDefinitions.BLAST_HIT
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

    const saveReleaseStatus = async () => {
        const { readsetIds } = releaseStatusOption
        let actions: Promise<any>[] = []
        Object.entries(readsetIds).forEach(([id, release_status]) => {
            const rs = readsetsByID[id];
            rs.release_status = release_status
            actions.push(dispatch(set_release_status(rs)))
        })
        await Promise.all(actions)
        dispatchReleaseStatusOptionTypeAll(undefined)
    }

    const mapContainerIDs = useItemsByIDToDataObjects(selectReadsetsByID, wrapReadset)
    const statusToggled = Object.keys(releaseStatusOption.readsetIds).length > 0
    const dispatchReleaseStatusOptionTypeAll = (release_status) => {
        if (release_status) {
            readsetTableState.items.forEach((id) => {
                const status = readsetsByID[id].release_status
                if (status != release_status) {
                    dispatchReleaseStatusOption({ type: "toggle", id, releaseStatus: OPPOSITE_STATUS[readsetsByID[id].release_status], readsetsByID })
                } else {
                    dispatchReleaseStatusOption({ type: "toggle", id, releaseStatus: readsetsByID[id].release_status, readsetsByID })
                }
            })
        } else {
            dispatchReleaseStatusOption({ type: "clear", release_status })
        }
    }
    const { all } = releaseStatusOption
    console.log(all)
    const extraButtons = <div>
        <Button
            style={{ margin: 6 }}
            onClick={() => dispatchReleaseStatusOptionTypeAll(RELEASED)}
            disabled={
                (all == 1 || !canReleaseOrBlockFiles) && !statusToggled
            }>
            Release All
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={() => dispatchReleaseStatusOptionTypeAll(BLOCKED)}
            disabled={
                (all == 2 || !canReleaseOrBlockFiles) && !statusToggled
            }>
            Block All
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={() => dispatchReleaseStatusOptionTypeAll(undefined)}
            disabled={!statusToggled}>
            Undo Changes
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={saveReleaseStatus}
            type={"primary"}
            disabled={!statusToggled}>
            Save Changes
        </Button>
    </div>

    return <div>
        <AppPageHeader title="Readsets" />
        <PageContent>
            <FilterPanel
                descriptions={[]}
                filters={filters}
                setFilter={readsetTableCallbacks.setFilterCallback}
                setFilterOption={readsetTableCallbacks.setFilterOptionsCallback}
            />
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
                                                            Number(readset.metrics[name].value_numeric).toFixed(3)
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