import { Button } from "antd";
import React from "react";
import { connect } from "react-redux";
import {listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/datasets/actions";
import AppPageHeader from "../AppPageHeader";
import { DATASET_FILTERS } from "../filters/descriptions";
import FiltersWarning from "../filters/FiltersWarning";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";

const getTableColumns = (datasetsById) => [
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
    },
    {
        title: "Files",
        dataIndex: "files",
        render: (files, _) => {
            return <>{
                files?.map(file => <div>{file.file_path}</div>) || ""
            }</>
        }
    },
    {
        title: "Completion Date",
        dataIndex: "completion_date",
        sorter: true,
        render: (_, dataset) => {
            return <>{dataset?.files?.find((f) => f?.completion_date)?.completion_date ?? "N/A"}</>
        }
    },
    {
        title: "Validation Date",
        dataIndex: "validation_date",
        sorter: true,
        render: (_, dataset) => {
            return <>{dataset?.files?.find((f) => f?.validation_date)?.validation_date ?? "N/A"}</>
        }
    }
]

const mapStateToProps = state => ({
    datasets: state.datasets.items,
    datasetsById: state.datasets.itemsByID,
    filters: state.datasets.filters,
    isFetching: state.datasets.isFetching,
    page: state.datasets.page,
    sortBy: state.datasets.sortBy,
    totalCount: state.datasets.totalCount,
});
const actionCreators = {listTable, setFilter, setFilterOption, clearFilters, setSortBy};

const DatasetsListContent = ({
    clearFilters,
    datasets,
    datasetsById,
    filters,
    isFetching,
    listTable,
    page,
    setFilter,
    setFilterOption,
    setSortBy,
    sortBy,
    totalCount,
}) => {
    const columns = getTableColumns(datasetsById)
    .map(c => Object.assign(c, getFilterProps(
        c,
        DATASET_FILTERS,
        filters,
        setFilter,
        setFilterOption
    )))

    const nFilters = getNFilters(filters)

    return <>
        <AppPageHeader title="Datasets"/>
        <PageContent>
        <div style={{ display: 'flex', textAlign: 'right', marginBottom: '1em' }}>
            <FiltersWarning
            nFilters={nFilters}
            filters={filters}
            description={DATASET_FILTERS}
            />
            <Button
            style={{ margin: 6 }}
            disabled={nFilters === 0}
            onClick={clearFilters}
            >
            Clear Filters
            </Button>
        </div>
        <PaginatedTable
            columns={columns}
            items={datasets}
            itemsByID={datasetsById}
            rowKey="id"
            loading={isFetching}
            totalCount={totalCount}
            page={page}
            filters={filters}
            sortBy={sortBy}
            onLoad={listTable}
            onChangeSort={setSortBy}
        />
        </PageContent>
    </>;
    }

export default connect(mapStateToProps, actionCreators)(DatasetsListContent);