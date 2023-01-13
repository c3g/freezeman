import { Button, Checkbox, Select, Spin, Switch } from "antd";
const { Option } = Select;
import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {setReleaseStatus, listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/datasets/actions";
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
            dataIndex: "external_project_id",
            sorter: true,
        },
        {
            title: "Lane",
            dataIndex: "lane",
            sorter: true,
        },
        {
            title: "Files Released",
            dataIndex: "released_status_count",
            sorter: true,
            render: (released_status_count, dataset) => {
                return `${released_status_count}/${dataset?.files?.length}`
            }
        },
        {
            title: "Latest Release Status Update",
            dataIndex: "latest_release_update",
            sorter: true,
            render: (latest_release_update, _) => {
                return latest_release_update ? moment(latest_release_update).format("YYYY-MM-DD LT") : ""
            }
        },
    ].map((column) => ({ ...column, key: column.title }))
}

const DatasetsListContent = () => {
    const datasets = useSelector((state) => state.datasets.items)
    const datasetsById = useSelector((state) => state.datasets.itemsByID)
    const filters = useSelector((state) => state.datasets.filters)
    const isFetching = useSelector((state) => state.datasets.isFetching)
    const page = useSelector((state) => state.datasets.page)
    const sortBy = useSelector((state) => state.datasets.sortBy)
    const totalCount = useSelector((state) => state.datasets.totalCount)
    
    const dispatch = useDispatch()
    const dispatchSetFilter = useCallback((...args) => dispatch(setFilter(...args)), [dispatch])
    const dispatchSetFilterOption = useCallback((...args) => dispatch(setFilterOption(...args)), [dispatch])
    const dispatchClearFilters = useCallback((...args) => dispatch(clearFilters(...args)), [dispatch])
    const dispatchListTable = useCallback((...args) => dispatch(listTable(...args)), [dispatch])
    const dispatchSetSortBy = useCallback((...args) => dispatch(setSortBy(...args)), [dispatch])

    const columns = getTableColumns().map(c => Object.assign(c, getFilterProps(
        c,
        DATASET_FILTERS,
        filters,
        dispatchSetFilter,
        dispatchSetFilterOption
    )))

    const nFilters = getNFilters(filters)

    return <>
        <AppPageHeader title="Datasets"/>
        <PageContent>
        <div className='filters-warning-bar'>
            <FiltersWarning
            nFilters={nFilters}
            filters={filters}
            description={DATASET_FILTERS}
            />
            <Button
            style={{ margin: 6 }}
            disabled={nFilters === 0}
            onClick={dispatchClearFilters}
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
            onLoad={dispatchListTable}
            onChangeSort={dispatchSetSortBy}
        />
        </PageContent>
    </>;
    }

export default DatasetsListContent;