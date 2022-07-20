import { Descriptions, Select, Switch } from "antd";
const { Option } = Select;
import Title from "antd/lib/skeleton/Title";
import React, { useEffect } from "react";
import { connect } from "react-redux";
import { useHistory, useParams } from "react-router-dom";
import {get} from "../../modules/datasets/actions";
import {listFilter, update} from "../../modules/datasetFiles/actions"
import AppPageHeader from "../AppPageHeader";
import FilteredList from "../FilteredList";
import { DATASET_FILE_FILTERS } from "../filters/descriptions";
import PageContent from "../PageContent";

const getTableColumns = (setReleaseFlag) => {
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
                const options = ["", "Released", "Block"]
                return <>
                    <Select defaultValue={options[release_flag]} onChange={setReleaseFlag(id)}>
                        {options.map((value, index) => {
                            return <Option value={index}>{value}</Option>
                        }).slice(1)}
                    </Select>
                </>
            }
        },
    ]
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
const actionCreators = {get, listFilter, update};

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
}) => {
    const history = useHistory();
    const {id: datasetId} = useParams();
    const dataset = datasetsById[datasetId];

    const columns = getTableColumns(
        (id) => (release_flag) => {
            update(id, {
                id,
                release_flag
            })
        })
    const filterKey = DATASET_FILE_FILTERS.dataset.key

    useEffect(() => {
        if (!dataset) {
            get(datasetId)
        }
    }, [datasetsById])

    return <>
    <AppPageHeader
        title={`Dataset ${dataset?.run_name}`}
        onBack={() => history.push("/datasets/list")}
    />

    <PageContent>
        <Descriptions bordered={true} size="small">
            <Descriptions.Item label={"ID"}>{dataset?.id}</Descriptions.Item>
            <Descriptions.Item label={"Run Name"}>{dataset?.run_name}</Descriptions.Item>
            <Descriptions.Item label={"Project"}>{dataset?.project_name}</Descriptions.Item>
            <Descriptions.Item label={"Lane"}>{dataset?.lane}</Descriptions.Item>
        </Descriptions>
        <Title level={1} style={{ marginTop: '1rem'}}>Files</Title>
        <FilteredList
            description = {DATASET_FILE_FILTERS}
            columns={columns}
            listFilter={listFilter}
            items={files}
            itemsByID={filesById}
            totalCount={totalCount}
            filterID={datasetId}
            filterKey={filterKey}
            rowKey="id"
            isFetching={isFetching}
            page={page}
        />
    </PageContent>
    </>
}

export default connect(mapStateToProps, actionCreators)(DatasetDetailContent);
