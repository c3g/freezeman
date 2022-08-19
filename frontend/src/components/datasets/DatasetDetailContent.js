import { Button, Checkbox, Descriptions, Select, Switch, Typography } from "antd";
const { Option } = Select;
import Title from "antd/lib/skeleton/Title";
import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import {get, setReleaseFlags} from "../../modules/datasets/actions";
import {listFilter, update} from "../../modules/datasetFiles/actions"
import AppPageHeader from "../AppPageHeader";
import FilteredList from "../FilteredList";
import { DATASET_FILE_FILTERS } from "../filters/descriptions";
import PageContent from "../PageContent";
import moment from "moment";
import useFilteredList from "../../hooks/useFilteredList";
import PaginatedList from "../shared/PaginatedList";

const RELEASE = 1
const BLOCK = 2
const RELEASE_FLAG_STRING = [null, "Release", "Block"]
const OPPOSITE_FLAGS = [null, 2, 1]

const getTableColumns = (setReleaseFlag, releaseFlagOption) => {
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
            title: "Release",
            dataIndex: "release_flag",
            render: (release_flag, file) => {
                const { id } = file;
                const releaseFlag = releaseFlagOption.specific[id] ?? releaseFlagOption.all ?? release_flag
                return <>
                    <Checkbox checked={releaseFlag == RELEASE} onChange={(ev) => setReleaseFlag(id, ev.target.checked ? RELEASE : BLOCK)} />
                </>
            }
        },
        {
            title: "Release Time",
            dataIndex: "release_flag_timestamp",
            sorter: true,
            render: (release_flag_timestamp, _) => {
                if (release_flag_timestamp) {
                    const date = moment(release_flag_timestamp)
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
    const allFilesReleased = dataset?.release_flag_count === dataset?.files?.length
    const allFilesBlocked = dataset?.release_flag_count === 0

    const releaseFlagOptionReducer = (state, action) => {
        switch(action.type) {
            case "all":
                return { all: action.release_flag, specific: {} }
            case "toggle": {
                const { all } = state
                const { id, releaseFlag, filesById } = action
                const newState = { ...state, specific: {...state.specific} }
                
                if (all) {
                    if (all !== releaseFlag) {
                        newState.specific[id] = releaseFlag
                    } else {
                        delete newState.specific[id]
                    }
                } else {
                    if (filesById[id]?.release_flag !== releaseFlag) {
                        newState.specific[id] = releaseFlag
                    } else {
                        delete newState.specific[id]
                    }
                }

                return newState
            }
        }
    }
    const [releaseFlagOption, dispatchReleaseFlagOption] = useReducer(
        releaseFlagOptionReducer,
        {
            all: undefined,
            specific: {},
        }
    )
    const specificFlagToggled = Object.keys(releaseFlagOption.specific).length > 0
    const dispatchReleaseFlagOptionTypeAll = (release_flag) => {
        dispatchReleaseFlagOption({ type: "all", release_flag })
    }

    const columns = getTableColumns(
        (id, releaseFlag) => {
            dispatchReleaseFlagOption({ type: "toggle", id, releaseFlag, filesById  })
        },
        releaseFlagOption
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
                dispatchReleaseFlagOptionTypeAll(RELEASE)
            }}
            disabled={
                (releaseFlagOption.all === RELEASE  || (!releaseFlagOption.all && allFilesReleased)) && !specificFlagToggled
            }>
            Release All
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={(ev) => {
                dispatchReleaseFlagOptionTypeAll(BLOCK)
            }}
            disabled={
                (releaseFlagOption.all === BLOCK  || (!releaseFlagOption.all && allFilesBlocked)) && !specificFlagToggled
            }>
            Block All
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={(ev) => {
                dispatchReleaseFlagOptionTypeAll(undefined)
            }}
            disabled={!releaseFlagOption.all && !specificFlagToggled}>
            Undo Changes
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={(ev) => {
                const { all, specific } = releaseFlagOption
                if (all) {
                    dispatch(setReleaseFlags(datasetId, all, Object.keys(specific), filters))
                } else {
                    Object.entries(specific).forEach(([id, release_flag]) => {
                        dispatch(update(id, {
                            id,
                            release_flag
                        }))
                    })
                }
                dispatchReleaseFlagOptionTypeAll(undefined)
            }}
            type={"primary"}
            disabled={!releaseFlagOption.all && !specificFlagToggled}>
            Save Changes
        </Button>
    </>

    return <>
    <AppPageHeader
        title={`Dataset ${loading(dataset?.project_name)} - ${loading(dataset?.run_name)} - ${loading(dataset?.lane)}`}
    />

    <PageContent>
        <Descriptions bordered={true} size={"small"} column={4}>
            <Descriptions.Item label={"ID"}>{loading(dataset?.id)}</Descriptions.Item>
            <Descriptions.Item label={"Project"}>{loading(dataset?.project_name)}</Descriptions.Item>
            <Descriptions.Item label={"Run Name"}>{loading(dataset?.run_name)}</Descriptions.Item>
            <Descriptions.Item label={"Lane"}>{loading(dataset?.lane)}</Descriptions.Item>
            <Descriptions.Item label={"Total Files"}>{loading(dataset?.files?.length)}</Descriptions.Item>
            <Descriptions.Item label={"Released"}>{loading(dataset?.release_flag_count)}</Descriptions.Item>
        </Descriptions>
        <Title level={1} style={{ marginTop: '1rem'}}>Files</Title>
        <PaginatedList {...paginatedListProps} other={extraButtons} />
    </PageContent>
    </>
}

export default DatasetDetailContent;
