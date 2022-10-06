import { Button, Checkbox, Descriptions, Select, Switch, Typography } from "antd";
const { Option } = Select;
import Title from "antd/lib/skeleton/Title";
import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import {get, setReleaseStatus} from "../../modules/datasets/actions";
import {listFilter, update} from "../../modules/datasetFiles/actions"
import AppPageHeader from "../AppPageHeader";
import FilteredList from "../FilteredList";
import { DATASET_FILE_FILTERS } from "../filters/descriptions";
import PageContent from "../PageContent";
import moment from "moment";
import useFilteredList from "../../hooks/useFilteredList";
import PaginatedList from "../shared/PaginatedList";

const AVAILABLE = 0
const RELEASED = 1
const BLOCKED = 2
const RELEASE_STATUS_STRING = ["Available", "Released", "Blocked"]
const OPPOSITE_STATUS = [0, 2, 1]

const getTableColumns = (setReleaseStatus, releaseStatusOption) => {
    return [
        {
            title: "ID",
            dataIndex: "id",
            sorter: true,
        },
        {
            title: "File Path",
            dataIndex: "file_path",
            sorter: true,
        },
        {
            title: "Sample Name",
            dataIndex: "sample_name",
            sorter: true,
        },
        {
            title: "Release Status",
            dataIndex: "release_status",
            render: (release_status, file) => {
                const { id } = file;
                const releaseStatus = releaseStatusOption.specific[id] ?? releaseStatusOption.all ?? release_status
                const changed = (releaseStatusOption.all && releaseStatusOption.all !== release_status && !releaseStatusOption.specific[id]) || (!releaseStatusOption.all && releaseStatusOption.specific[id])
                return <>
                    <Button style={{ color: changed ? "red" : "grey", width: "6em" }} onClick={() => setReleaseStatus(id, OPPOSITE_STATUS[releaseStatus])}>{RELEASE_STATUS_STRING[releaseStatus]}</Button>
                </>
            }
        },
        {
            title: "Latest Release Update",
            dataIndex: "release_status_timestamp",
            sorter: true,
            render: (release_status_timestamp, _) => {
                if (release_status_timestamp) {
                    const date = moment(release_status_timestamp)
                    return date.format("YYYY-MM-DD LT")
                } else {
                    return <></>
                }
            }
        }
    ].map((column) => ({ ...column, key: column.title }))
}

const DatasetDetailContent = () => {
    const datasetsById = useSelector((state) => state.datasets.itemsByID)
    const filesById = useSelector((state) => state.datasetFiles.itemsByID)
    const files = useSelector((state) => state.datasetFiles.filteredItems)
    const isFetching = useSelector((state) => state.datasetFiles.isFetching)
    const page = useSelector((state) => state.datasetFiles.page)
    const totalCount = useSelector((state) => state.datasetFiles.filteredItemsCount)

    const dispatch = useDispatch()
    const dispatchListFilter = useCallback((...args) => dispatch(listFilter(...args)), [dispatch])

    const {id: datasetId} = useParams();
    const dataset = datasetsById[datasetId];
    const allFilesReleased = dataset?.released_status_count === dataset?.files?.length
    const allFilesBlocked = dataset?.released_status_count === 0

    const releaseStatusOptionReducer = (state, action) => {
        switch(action.type) {
            case "all":
                return { all: action.release_status, specific: {} }
            case "toggle": {
                const { all } = state
                const { id, releaseStatus, filesById } = action
                const newState = { ...state, specific: {...state.specific} }
                
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
    const specificStatusToggled = Object.keys(releaseStatusOption.specific).length > 0
    const dispatchReleaseStatusOptionTypeAll = (release_status) => {
        dispatchReleaseStatusOption({ type: "all", release_status })
    }

    const columns = getTableColumns(
        (id, releaseStatus) => {
            dispatchReleaseStatusOption({ type: "toggle", id, releaseStatus, filesById  })
        },
        releaseStatusOption
    )
    const filterKey = DATASET_FILE_FILTERS.dataset.key
    
    useEffect(() => {
        if (!dataset) {
            dispatch(get(datasetId))
        }
    }, [datasetsById])

    const loading = (value) => {
        return value ?? "Loading..."
    }

    const paginatedListProps = useFilteredList({
        description: DATASET_FILE_FILTERS,
        columns: columns,
        listFilter: dispatchListFilter,
        items: files,
        itemsByID: filesById,
        totalCount: totalCount,
        filterID: datasetId,
        filterKey: filterKey,
        rowKey: "id",
        isFetching: isFetching,
        page: page,
    })

    const { filters } = paginatedListProps

    const extraButtons = <>
        <Button
            style={{ margin: 6 }}
            onClick={(ev) => {
                dispatchReleaseStatusOptionTypeAll(RELEASED)
            }}
            disabled={
                (releaseStatusOption.all === RELEASED  || (!releaseStatusOption.all && allFilesReleased)) && !specificStatusToggled
            }>
            Release All
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={(ev) => {
                dispatchReleaseStatusOptionTypeAll(BLOCKED)
            }}
            disabled={
                (releaseStatusOption.all === BLOCKED  || (!releaseStatusOption.all && allFilesBlocked)) && !specificStatusToggled
            }>
            Block All
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={(ev) => {
                dispatchReleaseStatusOptionTypeAll(undefined)
            }}
            disabled={!releaseStatusOption.all && !specificStatusToggled}>
            Undo Changes
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={(ev) => {
                const { all, specific } = releaseStatusOption
                if (all) {
                    dispatch(setReleaseStatus(datasetId, all, Object.keys(specific), filters))
                } else {
                    Object.entries(specific).forEach(([id, release_status]) => {
                        dispatch(update(id, {
                            id,
                            release_status
                        }))
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
    <AppPageHeader
        title={`Dataset ${loading(dataset?.external_project_id)} - ${loading(dataset?.run_name)} - ${loading(dataset?.lane)}`}
    />

    <PageContent>
        <Descriptions bordered={true} size={"small"} column={4}>
            <Descriptions.Item label={"ID"}>{loading(dataset?.id)}</Descriptions.Item>
            <Descriptions.Item label={"Project"}>{loading(dataset?.external_project_id)}</Descriptions.Item>
            <Descriptions.Item label={"Run Name"}>{loading(dataset?.run_name)}</Descriptions.Item>
            <Descriptions.Item label={"Lane"}>{loading(dataset?.lane)}</Descriptions.Item>
            <Descriptions.Item label={"Total Files"} span={2}>{loading(dataset?.files?.length)}</Descriptions.Item>
            <Descriptions.Item label={"Files Released"} span={2}>{loading(dataset?.released_status_count)}</Descriptions.Item>
        </Descriptions>
        <Title level={1} style={{ marginTop: '1rem'}}>Files</Title>
        <PaginatedList {...paginatedListProps} other={extraButtons} />
    </PageContent>
    </>
}

export default DatasetDetailContent;
