import { Button, Checkbox, Spin, Switch } from "antd";
import React, { useEffect } from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import {listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/datasets/actions";
import {update as updateFile, list as listFiles} from "../../modules/datasetFiles/actions";
import AppPageHeader from "../AppPageHeader";
import { DATASET_FILTERS } from "../filters/descriptions";
import FiltersWarning from "../filters/FiltersWarning";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";

const getTableColumns = (filesById, setReleaseFlag) => {
    return [
        {
            title: "ID",
            dataIndex: "id",
            sorter: true,
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
            title: "Release Flag",
            render: (_, dataset) => {
                const { files } = dataset
                const isReady = files.every((id) => id in filesById)
                if (isReady) {
                    const filesValue = files.map((id) => filesById[id])
                    const defaultChecked = filesValue.some((file) => file.release_flag === 1)
                    return <Switch defaultChecked={defaultChecked} onChange={setReleaseFlag(files)}/>
                } else {
                    return <Spin size={"small"} />
                }
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
    filesById: state.datasetFiles.itemsByID,
});
const actionCreators = {listTable, setFilter, setFilterOption, clearFilters, setSortBy, updateFile, listFiles};

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
    updateFile,
    filesById,
    listFiles,
}) => {
    const columns = getTableColumns(
        filesById,
        (files) => (checked) => {
            files.forEach((id) => updateFile(id, { id, release_flag: checked ? 1 : 2 }))
        }
    ).map(c => Object.assign(c, getFilterProps(
        c,
        DATASET_FILTERS,
        filters,
        setFilter,
        setFilterOption
    )))

    const nFilters = getNFilters(filters)

    useEffect(() => {
        const missingFiles = datasets.filter((datasetId) => datasetId in datasetsById)
                                     .flatMap((datasetId) => datasetsById[datasetId].files)
                                     .filter((fileId) => !(fileId in filesById))
        if (missingFiles.length > 0) {
            listFiles({id__in: missingFiles.join(",")})
        }
    })

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