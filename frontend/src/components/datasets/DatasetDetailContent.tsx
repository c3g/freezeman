import { Button, Descriptions, Space, Typography } from "antd"
import moment from "moment"
import React, { useCallback, useEffect, useReducer, useState } from "react"
import { useParams } from "react-router-dom"
import { useAppDispatch, useAppSelector } from '../../hooks'
import useFilteredList from "../../hooks/useFilteredList"
import { listFilter, update } from "../../modules/datasetFiles/actions"
import { get, setReleaseStatus } from "../../modules/datasets/actions"
import { selectDatasetFilesByID, selectDatasetFilesState, selectDatasetsByID } from "../../selectors"
import AppPageHeader from "../AppPageHeader"
import PageContent from "../PageContent"
import { DATASET_FILE_FILTERS } from "../filters/descriptions"
import PaginatedList from "../shared/PaginatedList"
import { Dataset, DatasetFile } from "../../models/frontend_models"
import { ValidationStatus } from "../../modules/experimentRunLanes/models"
import api from "../../utils/api"
import { InfoCircleOutlined } from "@ant-design/icons"
const { Title, Text } = Typography

const AVAILABLE = 0
const RELEASED = 1
const BLOCKED = 2
const RELEASE_STATUS_STRING = ["Available", "Released", "Blocked"]
const OPPOSITE_STATUS = [RELEASED, BLOCKED, RELEASED]

const getTableColumns = (toggleReleaseStatus, releaseStatusOption) => {
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
            render: (release_status: number, file) => {
                const { id } = file;
                const releaseStatus = releaseStatusOption.specific[id] ?? releaseStatusOption.all ?? release_status
                const changed = (releaseStatusOption.all && releaseStatusOption.all !== release_status && !releaseStatusOption.specific[id]) || (!releaseStatusOption.all && releaseStatusOption.specific[id])
                return <>
                    <Button style={{ color: changed ? "red" : "grey", width: "6em" }} onClick={() => toggleReleaseStatus(id, OPPOSITE_STATUS[releaseStatus])}>{RELEASE_STATUS_STRING[releaseStatus]}</Button>
                </>
            }
        },
        {
            title: "Latest Release Update",
            dataIndex: "release_status_timestamp",
            sorter: true,
            render: (release_status_timestamp) => {
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
    const datasetsById = useAppSelector(selectDatasetsByID)

    const datasetFilesState = useAppSelector(selectDatasetFilesState)
    const filesById = useAppSelector(selectDatasetFilesByID)
    const files = datasetFilesState.filteredItems as DatasetFile[]
    const isFetching = datasetFilesState.isFetching
    const page = datasetFilesState.page
    const totalCount = datasetFilesState.filteredItemsCount

    const dispatch = useAppDispatch()
    const dispatchListFilter = useCallback((...args) => dispatch(listFilter(...args)), [dispatch])

    const {id: datasetId} = useParams();
    const dataset: Dataset | undefined = datasetsById[datasetId!];
    const allFilesReleased = dataset?.released_status_count === dataset?.files?.length
    const allFilesBlocked = dataset?.released_status_count === 0

    const [laneValidationStatus, setLaneValidationStatus] = useState<ValidationStatus>()

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
    const filterKey = DATASET_FILE_FILTERS.readset__dataset.key
    
    useEffect(() => {
        if (!dataset) {
            dispatch(get(datasetId))
        }
    }, [dataset, datasetId, datasetsById, dispatch])

    useEffect(() => {
        async function fetchLaneValidationStatus(dataset: Dataset) {
            const status = await dispatch(api.experimentRuns.getLaneValidationStatus(dataset.run_name, dataset.lane))
            return status.data
        }

        if (dataset && !dataset.isFetching && !laneValidationStatus) {
            fetchLaneValidationStatus(dataset).then((status) => {
                setLaneValidationStatus(status)
            })
        }
    }, [dataset, laneValidationStatus, dispatch])

    const canReleaseOrBlockFiles = (laneValidationStatus === ValidationStatus.PASSED || laneValidationStatus === ValidationStatus.FAILED)

    let laneValidationStatusString = ''
    if (laneValidationStatus !== undefined) {
        switch(laneValidationStatus) {
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

    const loading = (value: string | number | undefined) => {
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
        isFetching: isFetching,
        page: page,
    })

    const { filters } = paginatedListProps

    const extraButtons = <>
        <Button
            style={{ margin: 6 }}
            onClick={() => {
                dispatchReleaseStatusOptionTypeAll(RELEASED)
            }}
            disabled={
                (releaseStatusOption.all === RELEASED  || (!releaseStatusOption.all && allFilesReleased)) && !specificStatusToggled
            }>
            Release All
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={() => {
                dispatchReleaseStatusOptionTypeAll(BLOCKED)
            }}
            disabled={
                (releaseStatusOption.all === BLOCKED  || (!releaseStatusOption.all && allFilesBlocked)) && !specificStatusToggled
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
            <Descriptions.Item label={"ID"} span={1}>{loading(dataset?.id)}</Descriptions.Item>
            <Descriptions.Item label={"Project"} span={1}>{loading(dataset?.external_project_id)}</Descriptions.Item>
            <Descriptions.Item label={"Run Name"} span={2}>{loading(dataset?.run_name)}</Descriptions.Item>
            <Descriptions.Item label={"Lane"} span={1}>{loading(dataset?.lane)}</Descriptions.Item>
            <Descriptions.Item label={"Validation Status"} span={1}>{loading(laneValidationStatusString)}</Descriptions.Item>
            <Descriptions.Item label={"Total Files"} span={1}>{loading(dataset?.files?.length)}</Descriptions.Item>
            <Descriptions.Item label={"Files Released"} span={1}>{loading(dataset?.released_status_count)}</Descriptions.Item>
        </Descriptions>
        <Title level={1} style={{ marginTop: '1rem'}}>Files</Title>
        {laneValidationStatus !== undefined &&  !canReleaseOrBlockFiles &&
            <Space>
                <InfoCircleOutlined/>
                <Text italic>Files cannot be released until the dataset lane has been validated</Text>
            </Space>
            
        }
        <PaginatedList {...paginatedListProps} other={canReleaseOrBlockFiles ? extraButtons : undefined} />
    </PageContent>
    </>
}

export default DatasetDetailContent;
