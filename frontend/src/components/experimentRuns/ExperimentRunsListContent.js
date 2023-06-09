import { Tag } from "antd";
import React from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";

import PaginatedTable from "../PaginatedTable";

import { clearFilters, listTable, setFilter, setFilterOption, setSortBy } from "../../modules/experimentRuns/actions";
import { EXPERIMENT_RUN_FILTERS } from "../filters/descriptions";
import { WithContainerRenderComponent } from "../shared/WithItemRenderComponent";
import { getFilterPropsIncludingDescriptions } from '../shared/WorkflowSamplesTable/getFilterPropsTS';
import ExperimentRunLaunchCard from "./ExperimentRunLaunchCard";


const getTableColumns = (runTypes, instruments, launchesById) => [
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
    title: "Container Barcode",
    dataIndex: "container__barcode",
    sorter: true,
    render: (_, experimentRun) => (experimentRun.container &&
      <Link to={`/containers/${experimentRun.container}`}>
        <WithContainerRenderComponent objectID={experimentRun.container} placeholder={'loading...'} render={container => <span>{container.barcode}</span>}/>
      </Link>),
  },
  {
    title: "Start Date",
    dataIndex: "start_date",
    sorter: true,
    width: 180,
  },
  {
    title: "Launch",
    dataIndex: "run_processing_launch_time",
    sorter: true,
    render: (_, experimentRun) => (
      <div style={{minWidth: "12rem"}}>
        <ExperimentRunLaunchCard experimentRun={experimentRun} experimentRunLaunch={launchesById[experimentRun.id]}/>
      </div>
    )
  },
];

const mapStateToProps = state => ({
  experimentRunsByID: state.experimentRuns.itemsByID,
  experimentRuns: state.experimentRuns.items,
  launchesById: state.experimentRunLaunches.launchesById,
  runTypes: state.runTypes,
  instruments: state.instruments,
  page: state.experimentRuns.page,
  totalCount: state.experimentRuns.totalCount,
  isFetching: state.experimentRuns.isFetching,
  filters: state.experimentRuns.filters,
  sortBy: state.experimentRuns.sortBy,
  actions: state.experimentRunTemplateActions,
});

const mapDispatchToProps = {listTable, setFilter, setFilterOption, clearFilters, setSortBy};

const ExperimentRunsListContent = ({
  experimentRuns,
  experimentRunsByID,
  launchesById,
  runTypes,
  instruments,
  isFetching,
  page,
  totalCount,
  filters,
  sortBy,
  listTable,
  setFilter,
  setFilterOption,
  setSortBy,
}) => {

  const columns = getTableColumns(runTypes, instruments, launchesById)
  .map(c => Object.assign(c, getFilterPropsIncludingDescriptions(
    c,
    EXPERIMENT_RUN_FILTERS,
    filters,
    setFilter,
    setFilterOption
  )))

  return <>
    <>
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
        onLoad={listTable}
        onChangeSort={setSortBy}
      />
    </>
  </>;
};

export default connect(mapStateToProps, mapDispatchToProps)(ExperimentRunsListContent);
