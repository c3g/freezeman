import { Button, Checkbox, Descriptions, Select, Switch } from "antd";
const { Option } = Select;
import Title from "antd/lib/skeleton/Title";
import React, { useEffect, useReducer, useRef, useState } from "react";
import { connect } from "react-redux";
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
            title: "Release Flag",
            dataIndex: "release_flag",
            render: (release_flag, file) => {
                const { id } = file;
                const releaseFlag = releaseFlagOption.toggled[id] ?? releaseFlagOption.all ?? release_flag
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

const mapStateToProps = state => ({
    datasetsById: state.datasets.itemsByID,
    filesById: state.datasetFiles.itemsByID,
    files: state.datasetFiles.filteredItems,
    filters: state.datasetFiles.filters,
    isFetching: state.datasetFiles.isFetching,
    page: state.datasetFiles.page,
    sortBy: state.datasetFiles.sortBy,
    totalCount: state.datasetFiles.filteredItemsCount,
});
const actionCreators = {get, listFilter, update, setReleaseFlags};

const DatasetDetailContent = ({
    get,
    datasetsById,
    files,
    filesById,
    isFetching,
    listFilter,
    page,
    totalCount,
    update,
    setReleaseFlags,
}) => {
    const {id: datasetId} = useParams();
    const dataset = datasetsById[datasetId];
    const [globalReleaseFlag, setGlobalReleaseFlag] = useState(dataset && dataset.release_flag_count === dataset.files?.length ? BLOCK : RELEASE)

    const releaseFlagOptionReducer = (state, action) => {
        switch(action.type) {
            case "all":
                return { all: action.release_flag, toggled: {} }
            case "toggle": {
                const { all } = state
                const { id, releaseFlag, filesById } = action
                const newState = { ...state }
                
                if (all) {
                    if (all !== releaseFlag) {
                        newState.toggled[id] = releaseFlag
                    } else {
                        delete newState.toggled[id]
                    }
                } else {
                    if (filesById[id]?.release_flag !== releaseFlag) {
                        newState.toggled[id] = releaseFlag
                    } else {
                        delete newState.toggled[id]
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
            toggled: {},
        }
    )
    console.log(releaseFlagOption);

    const columns = getTableColumns(
        (id, releaseFlag) => {
            dispatchReleaseFlagOption({ type: "toggle", id, releaseFlag, filesById  })
        },
        releaseFlagOption
    )
    const filterKey = DATASET_FILE_FILTERS.dataset.key
    
    useEffect(() => {
        if (!dataset) {
            get(datasetId)
        }
    }, [datasetsById])

    const loading = (value) => {
        return value ?? "Loading..."
    }

    const paginatedListProps = useFilteredList({
        description: DATASET_FILE_FILTERS,
        columns: columns,
        listFilter: listFilter,
        items: files,
        itemsByID: filesById,
        totalCount: totalCount,
        filterID: datasetId,
        filterKey: filterKey,
        rowKey: "id",
        isFetching: isFetching,
        page: page,
    })

    const extraButtons = <>
        <Button
            style={{ margin: 6 }}
            onClick={(ev) => {
                setGlobalReleaseFlag(OPPOSITE_FLAGS[globalReleaseFlag])
                if (releaseFlagOption.all) {
                    dispatchReleaseFlagOption({ type: "all", release_flag: OPPOSITE_FLAGS[globalReleaseFlag] })
                }
            }}>
            Flag: {globalReleaseFlag ? RELEASE_FLAG_STRING[globalReleaseFlag] : "Loading..."}
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={(ev) => releaseFlagOption.all
                ? dispatchReleaseFlagOption({ type: "all", release_flag: undefined })
                : dispatchReleaseFlagOption({ type: "all", release_flag: globalReleaseFlag })}>
            {releaseFlagOption.all ? "Reset Toggles" : `${RELEASE_FLAG_STRING[globalReleaseFlag]} All Files`}
        </Button>
        <Button
            style={{ margin: 6 }}
            onClick={(ev) => {
                const { all, toggled } = releaseFlagOption
                if (all) {
                    setReleaseFlags(datasetId, all, Object.keys(toggled))
                } else {
                    Object.entries(toggled).forEach(([id, release_flag]) => {
                        update(id, {
                            id,
                            release_flag
                        })
                    })
                }
                dispatchReleaseFlagOption({ type: "all", release_flag: undefined })
            }}>
            Apply Changes
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
        </Descriptions>
        <Title level={1} style={{ marginTop: '1rem'}}>Files</Title>
        <PaginatedList {...paginatedListProps} other={extraButtons} />
    </PageContent>
    </>
}

export default connect(mapStateToProps, actionCreators)(DatasetDetailContent);
