import { Button } from "antd"
import moment from "moment"
import React, { useCallback } from "react"

import { Link } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { clearFilters, listFilter, listTable, setFilter, setFilterOption, setSortBy } from "../../modules/datasets/actions"
import { selectDatasetsState } from "../../selectors"
import ExpandableTableDatasetComments from "./ExpandableTableDatasetComments"

import { FMSDataset, ValidationStatus } from "../../models/fms_api_models"
import FilteredList from "../FilteredList"
import PaginatedTable from "../PaginatedTable"
import FiltersWarning from "../filters/FiltersWarning"
import { DATASET_FILTERS } from "../filters/descriptions"
import getFilterProps from "../filters/getFilterProps"
import getNFilters from "../filters/getNFilters"
import { CheckOutlined, CloseOutlined } from "@ant-design/icons"


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
            title: "Validation Status",
            dataIndex: "validation_status",
            render: (validation_status) => {
                return (
                    (validation_status === ValidationStatus.PASSED && <Button style={{color: "#a0d911"}}><CheckOutlined onPointerEnterCapture={undefined} onPointerLeaveCapture={undefined}/>Passed</Button>)
                    ||
                    (validation_status === ValidationStatus.FAILED && <Button style={{color: "#f5222d"}}><CloseOutlined onPointerEnterCapture={undefined} onPointerLeaveCapture={undefined}/>Failed</Button>)
                )
            }
        },
        {
            title: "Readsets Released",
            dataIndex: "released_status_count",
            sorter: true,
            render: (released_status_count, dataset) => {
                return `${released_status_count}/${dataset?.readset_count}`
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

interface DatasetTableProps {
    run_name?: FMSDataset['run_name']
}

const DatasetTable = ({ run_name }: DatasetTableProps) => {
    const datasetsState = useAppSelector(selectDatasetsState)

    const datasets = datasetsState.items
    const filteredDatasets = datasetsState.filteredItems
    const datasetsById = datasetsState.itemsByID
    
    const totalFilteredCount = datasetsState.filteredItemsCount
    const totalCount = datasetsState.totalCount

    const filters = datasetsState.filters
    const isFetching = datasetsState.isFetching
    const sortBy = datasetsState.sortBy
    const page = datasetsState.page

    const dispatch = useAppDispatch()
    const dispatchSetFilter = useCallback((...args) => dispatch(setFilter(...args)), [dispatch])
    const dispatchSetFilterOption = useCallback((...args) => dispatch(setFilterOption(...args)), [dispatch])
    const dispatchClearFilters = useCallback((...args) => dispatch(clearFilters(...args)), [dispatch])
    const dispatchListFilter = useCallback((...args) => dispatch(listFilter(...args)), [dispatch])
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
        {
            run_name
                ? <FilteredList
                    description={DATASET_FILTERS}
                    columns={columns.filter((col) => col.dataIndex !== 'run_name')}
                    listFilter={dispatchListFilter}
                    items={filteredDatasets}
                    itemsByID={datasetsById}
                    totalCount={totalFilteredCount}
                    filterID={run_name}
                    filterKey={DATASET_FILTERS.run_name.key}
                    isFetching={isFetching}
                    page={page}
                    expandable={ExpandableTableDatasetComments()}
                />
                : <>
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
                        filters={filters}
                        sortBy={sortBy}
                        onLoad={dispatchListTable}
                        onChangeSort={dispatchSetSortBy}
                        filterKey={undefined}   // TS complains if the filterKey prop is missing
                        expandable={ExpandableTableDatasetComments()}
                    />
                </>
        }
    </>
}

export default DatasetTable