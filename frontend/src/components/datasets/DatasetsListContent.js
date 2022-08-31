import { Button, Checkbox, Select, Spin, Switch } from "antd";
const { Option } = Select;
import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
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
            title: "Files Released",
            dataIndex: "release_flag_count",
            sorter: true,
            render: (release_flag_count, dataset) => {
                return `${release_flag_count}/${dataset?.files?.length}`
            }
        },
        // {
        //     title: "Last Release Time",
        //     dataIndex: "last_release_timestamp",
        //     sorter: true,
        //     render: (last_release_timestamp, _) => {
        //         return last_release_timestamp ? moment(last_release_timestamp).format("YYYY-MM-DD LT") : ""
        //     }
        // },
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
        <div style={{ textAlign: 'right', marginBottom: '1em' }}>
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