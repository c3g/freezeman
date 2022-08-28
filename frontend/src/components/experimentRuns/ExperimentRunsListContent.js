import { useDispatch, useSelector } from "react-redux"
import React from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import ExportButton from "../ExportButton";

import api, {withToken}  from "../../utils/api"
import {listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/experimentRuns/actions";
import {EXPERIMENT_RUN_FILTERS, SAMPLE_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import FiltersWarning from "../filters/FiltersWarning";
import mergedListQueryParams from "../../utils/mergedListQueryParams";
import {withContainer} from "../../utils/withItem";
import {actionDropdown} from "../../utils/templateActions";


const getTableColumns = (containersByID, runTypes, instruments) => [
  {
    title: "ID",
    dataIndex: "id",
    sorter: true,
    render: (_, experimentRun) => (experimentRun.id &&
      <Link to={`/experiment-runs/${experimentRun.id}`}>
        {experimentRun.id}
      </Link>),
  },
  {
    title: "Name",
    dataIndex: "name",
    sorter: true,
  },
  {
    title: "Run Type",
    dataIndex: "run_type",
    sorter: true,
    options: runTypes.items.map(x => ({ label: x.name, value: x.name })), // for getFilterProps
    render: (_, experimentRun) =>
      <Tag>{runTypes.itemsByID[experimentRun.run_type]?.name}</Tag>,
  },
  {
    title: "Instrument",
    dataIndex: "instrument",
    sorter: true,
    options: instruments.items.map(x => ({ label: x.name, value: x.name })), // for getFilterProps
    render: (_, experimentRun) =>
      <div>{instruments.itemsByID[experimentRun.instrument]?.name}</div>,
  },
  {
    title: "Instrument Type",
    dataIndex: "instrument_type",
    sorter: true,
    render: (_, experimentRun) =>
      <div>{experimentRun.instrument_type}</div>,
  },
  {
    title: "Container Name",
    dataIndex: "container__name",
    sorter: true,
    render: (_, experimentRun) =>
      (experimentRun.container &&
        withContainer(containersByID, experimentRun.container, container => container.name, "loading...")),
  },
  {
    title: "Container Barcode",
    dataIndex: "container__barcode",
    sorter: true,
    render: (_, experimentRun) => (experimentRun.container &&
      <Link to={`/containers/${experimentRun.container}`}>
        {withContainer(containersByID, experimentRun.container, container => container.barcode, "loading...")}
      </Link>),
  },
  {
    title: "Start Date",
    dataIndex: "start_date",
    sorter: true,
    width: 180,
  },

];





const ExperimentRunsListContent = ({  }) => {
  const token = useSelector((state) => state.auth.tokens.access)
  const containersByID = useSelector((state) => state.containers.itemsByID)
  const experimentRunsByID = useSelector((state) => state.experimentRuns.itemsByID)
  const experimentRuns = useSelector((state) => state.experimentRuns.items)
  const runTypes = useSelector((state) => state.runTypes)
  const instruments = useSelector((state) => state.instruments)
  const page = useSelector((state) => state.experimentRuns.page)
  const totalCount = useSelector((state) => state.experimentRuns.totalCount)
  const isFetching = useSelector((state) => state.experimentRuns.isFetching)
  const filters = useSelector((state) => state.experimentRuns.filters)
  const sortBy = useSelector((state) => state.experimentRuns.sortBy)
  const actions = useSelector((state) => state.experimentRunTemplateActions)
  const dispatch = useDispatch()
  const dispatchListTable = useCallback((...args) => listTable(...args), [dispatch])
  const dispatchSetFilter = useCallback((...args) => setFilter(...args), [dispatch])
  const dispatchSetFilterOption = useCallback((...args) => setFilterOption(...args), [dispatch])
  const dispatchClearFilters = useCallback((...args) => clearFilters(...args), [dispatch])
  const dispatchSetSortBy = useCallback((...args) => setSortBy(...args), [dispatch])

  const listExport = () =>
    withToken(token, api.experimentRuns.listExport)
    (mergedListQueryParams(EXPERIMENT_RUN_FILTERS, filters, sortBy))
      .then(response => response.data)


  const columns = getTableColumns(containersByID, runTypes, instruments)
  .map(c => Object.assign(c, getFilterProps(
    c,
    EXPERIMENT_RUN_FILTERS,
    filters,
    dispatchSetFilter,
    dispatchSetFilterOption
  )))

  const nFilters = getNFilters(filters)

  return <>
    <AppPageHeader title="Experiments" extra={[
        actionDropdown("/experiment-runs", actions),
        <ExportButton key='export' exportFunction={listExport} filename="experiments"  itemsCount={totalCount}/>,
    ]}/>
    <PageContent>
      <div style={{ display: 'flex', textAlign: 'right', marginBottom: '1em' }}>
        <div style={{ flex: 1 }} />
        <FiltersWarning
          nFilters={nFilters}
          filters={filters}
          description={EXPERIMENT_RUN_FILTERS}
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
        items={experimentRuns}
        itemsByID={experimentRunsByID}
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
};

export default ExperimentRunsListContent;
