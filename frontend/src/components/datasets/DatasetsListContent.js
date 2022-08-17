import { Button, Checkbox, Select, Spin, Switch } from "antd";
const { Option } = Select;
import React, { useEffect } from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import {setReleaseFlags, listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/datasets/actions";
import AppPageHeader from "../AppPageHeader";
import { DATASET_FILTERS } from "../filters/descriptions";
import FiltersWarning from "../filters/FiltersWarning";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import moment from "moment";

const getTableColumns = () => {
    return [
        {
            title: "ID",
            dataIndex: "id",
            sorter: true,
            width: 90,
            render: (id, _) => {
                return <Link to={`/datasets/${id}`}>
                <div>{id}</div>
              </Link>
            }
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
            title: "Last Release Time",
            dataIndex: "last_release_timestamp",
            sorter: true,
            render: (last_release_timestamp, _) => {
                return last_release_timestamp ? moment(last_release_timestamp).format("YYYY-MM-DD LT") : ""
            }
        },
    ]
}

const mapStateToProps = state => ({
    datasets: state.datasets.items,
    datasetsById: state.datasets.itemsByID,
    filters: state.datasets.filters,
    isFetching: state.datasets.isFetching,
    page: state.datasets.page,
    sortBy: state.datasets.sortBy,
    totalCount: state.datasets.totalCount,
});
const actionCreators = {listTable, setFilter, setFilterOption, clearFilters, setSortBy, setReleaseFlags};

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
    setReleaseFlags,
}) => {
    const columns = getTableColumns().map(c => Object.assign(c, getFilterProps(
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
        <div style={{ textAlign: 'right', marginBottom: '1em' }}>
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