import React, { useCallback, useEffect, useReducer } from "react"
import AppPageHeader from "../AppPageHeader"
import PageContent from "../PageContent"
import ReadsetTableActions from "../../modules/readsetsTable/actions"
import PagedItemsTable from "../pagedItemsTable/PagedItemsTable";
import FilterPanel from "../filters/filterPanel/FilterPanel";
import FiltersBar from "../filters/filtersBar/FiltersBar";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectReadsetsByID, selectReadsetsTable } from "../../selectors";
import { BLOCKED, OPPOSITE_STATUS, ObjectWithReadset, READSET_COLUMN_DEFINITIONS, READSET_COLUMN_FILTERS, READSET_FILTER_KEYS, RELEASED } from "./ReadsetsTableColumns";
import { Dataset, Readset } from "../../models/frontend_models";
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks";
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns";
import { useItemsByIDToDataObjects } from '../pagedItemsTable/useItemsByIDToDataObjects'
import { Button } from "antd";
import { set_release_status } from "../../modules/readsets/actions";
import { ValidationStatus } from "../../modules/experimentRunLanes/models";
import { MinusCircleTwoTone, PlusCircleTwoTone } from "@ant-design/icons";
import { createFixedFilter } from "../../models/paged_items";
import { FILTER_TYPE } from "../../constants";



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
    const { filters, sortBy, totalCount } = readsetTableState
    const allFilesReleased = dataset?.released_status_count === Object.keys(readsetsByID).length
    const allFilesBlocked = dataset?.blocked_status_count === Object.keys(readsetsByID).length
    useEffect(() => {
        if (dataset) {
            dispatch(ReadsetTableActions.resetPagedItems())
            dispatch(ReadsetTableActions.setFixedFilter(createFixedFilter(FILTER_TYPE.INPUT_OBJECT_ID, 'dataset__id', String(dataset?.id))))
            dispatch(ReadsetTableActions.listPage(1))
        }
    }, [dataset, dispatch])

    const canReleaseOrBlockFiles = (laneValidationStatus === ValidationStatus.PASSED || laneValidationStatus === ValidationStatus.FAILED)

    const releaseStatusOptionReducer = (state, action) => {
        switch (action.type) {
            case "clear":
                return { specific: {} }
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
    const saveReleaseStatus = async () => {
        const { specific } = releaseStatusOption
        let actions: Promise<any>[] = []
        Object.entries(specific).forEach(([id, release_status]) => {
            const rs = readsetsByID[id];
            rs.release_status = release_status
            actions.push(dispatch(set_release_status(rs)))
        })
        await Promise.all(actions)
        dispatchReleaseStatusOptionTypeAll(undefined)
    }
    const mapContainerIDs = useItemsByIDToDataObjects(selectReadsetsByID, wrapReadset)
    const specificStatusToggled = Object.keys(releaseStatusOption.specific).length > 0
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

    const extraButtons = <div>
        <Button
            style={{ margin: 6 }}
            onClick={() => dispatchReleaseStatusOptionTypeAll(RELEASED)}
            disabled={
                (releaseStatusOption.all === RELEASED || (!releaseStatusOption.all && allFilesReleased)) && !specificStatusToggled
            }>
            Release All
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={() => dispatchReleaseStatusOptionTypeAll(BLOCKED)}
            disabled={
                (releaseStatusOption.all === BLOCKED || (!releaseStatusOption.all && allFilesBlocked)) && !specificStatusToggled
            }>
            Block All
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={() => dispatchReleaseStatusOptionTypeAll(undefined)}
            disabled={!releaseStatusOption.all && !specificStatusToggled}>
            Undo Changes
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={saveReleaseStatus}
            type={"primary"}
            disabled={!releaseStatusOption.all && !specificStatusToggled}>
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
                // setFixedFilterCallback={}
                expandable={{
                    expandIcon: ({ expanded, onExpand, record }) =>
                        expanded ? (
                            <div>
                                Hide Metrics
                                <MinusCircleTwoTone onClick={e => onExpand(record, e)} />
                            </div>
                        ) : (
                            <div>
                                View Metrics
                                <PlusCircleTwoTone onClick={e => onExpand(record, e)} />
                            </div>

                        )
                    ,
                    expandedRowRender: (record) => {
                        const readset: Readset = record.readset
                        return (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'row',
                                gap: '1em'
                            }} key={readset.id}>
                                {
                                    readset.metrics ?
                                        Object.keys(readset.metrics).map(
                                            (name) => {
                                                return (
                                                    readset.metrics && (readset.metrics[name].value_numeric || readset.metrics[name].value_string) &&
                                                    <>

                                                        <div style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            width: '10em'
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
                                                        </div>
                                                    </>)
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