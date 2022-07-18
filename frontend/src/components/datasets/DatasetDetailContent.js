import { Descriptions } from "antd";
import Title from "antd/lib/skeleton/Title";
import React, { useEffect } from "react";
import { connect } from "react-redux";
import { useHistory, useParams } from "react-router-dom";
import {get, listFilter, setFilter, setFilterOption, clearFilters, setSortBy, update} from "../../modules/datasets/actions";
import AppPageHeader from "../AppPageHeader";
import FilteredList from "../FilteredList";
import { DATASET_FILTERS } from "../filters/descriptions";
import PageContent from "../PageContent";

const getTableColumns = (datasetsById, releaseAllFiles) => {
    const findValidationDate = (dataset) => dataset?.files?.find((f) => f?.validation_date)?.validation_date
    const toDate = (date) => date && new Date(date).toISOString().substring(0, 10)

    return [
        {
            title: "ID",
            dataIndex: "id",
            sorter: true,
        },
        {
            title: "Run",
            dataIndex: "run_name",
            sorter: true,
        },
        {
            title: "Project",
            dataIndex: "project_name",
            sorter: true,
        },
        {
            title: "Lane",
            dataIndex: "lane",
            sorter: true,
        },
        {
            title: "Files",
            dataIndex: "files",
            render: (files, _) => {
                // TODO: make this a link to the files
                return <>{`${files?.length} files`}</>
            }
        },
        {
            title: "Completion Date",
            dataIndex: "completion_date",
            render: (_, dataset) => {
                return <>{toDate(dataset?.files?.find((f) => f?.completion_date)?.completion_date) ?? "Unknown"}</>
            }
        },
        {
            title: "Validation Date",
            dataIndex: "validation_date",
            render: (_, dataset) => {
                return <>{toDate(findValidationDate(dataset)) ?? "Waiting for Validation"}</>
            }
        },
        {
            title: "Released",
            render: (_, dataset) => {
                const invalidationDate = findValidationDate(dataset)
                return <Checkbox
                checked={invalidationDate}
                onChange={() => releaseAllFiles(dataset, !invalidationDate)} />
            }
        }
    ]
}

const mapStateToProps = state => ({
    // datasets: state.datasets.filteredItems,
    datasetsById: state.datasets.itemsByID,
    // filters: state.datasets.filters,
    // isFetching: state.datasets.isFetching,
    // page: state.datasets.page,
    // sortBy: state.datasets.sortBy,
    // totalCount: state.datasets.filteredItemsCount,
});
const actionCreators = {get, listFilter, setFilter, setFilterOption, clearFilters, setSortBy, update};

const DatasetDetailContent = ({
    get,
    // clearFilters,
    // datasets,
    datasetsById,
    // filters,
    // isFetching,
    // listFilter,
    // page,
    // setFilter,
    // setFilterOption,
    // setSortBy,
    // sortBy,
    // totalCount,
    // update,
}) => {
    const history = useHistory();
    const {id} = useParams();
    const dataset = datasetsById[id];

    // const columns = getTableColumns(datasetsById, (dataset, release) => {})

    useEffect(() => {
        if (!dataset) {
            get(id)
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
    </PageContent>
    </>
}

export default connect(mapStateToProps, actionCreators)(DatasetDetailContent);
