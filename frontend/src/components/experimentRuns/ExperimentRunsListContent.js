import React from "react";
import {connect, useDispatch} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Space, Spin, Tag, Typography} from "antd";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import ExportButton from "../ExportButton";

import api, {withToken}  from "../../utils/api"
import {launchExperimentRun, listTable, setFilter, setFilterOption, clearFilters, setSortBy, flushExperimentRunLaunch} from "../../modules/experimentRuns/actions";
import {EXPERIMENT_RUN_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import FiltersWarning from "../filters/FiltersWarning";
import mergedListQueryParams from "../../utils/mergedListQueryParams";
import {withContainer} from "../../utils/withItem";
import {actionDropdown} from "../../utils/templateActions";
import moment from "moment"
import { LAUNCH_STATUS } from "../../modules/experimentRuns/reducers";
import { CloseSquareOutlined, WarningOutlined } from "@ant-design/icons";

const { Text } = Typography


const getTableColumns = (containersByID, runTypes, instruments, launchesById) => [
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
  // Make space for launch controls
  // {
  //   title: "Container Name",
  //   dataIndex: "container__name",
  //   sorter: true,
  //   render: (_, experimentRun) =>
  //     (experimentRun.container &&
  //       withContainer(containersByID, experimentRun.container, container => container.name, "loading...")),
  // },
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
  {
    title: "Launch",
    dataIndex: "run_processing_launch_date",
    sorter: true,
    render: (_, experimentRun) => (
      <div style={{minWidth: "220px"}}>
        <ExperimentRunLaunchField experimentRun={experimentRun} experimentRunLaunch={launchesById[experimentRun.id]}/>
      </div>
     
    )
  },
];

const ExperimentRunLaunchField = ({experimentRun, experimentRunLaunch}) => {
  /*
    Cases:
      - run has never been launched
      - run was launched in the past
      - run is being launched
      - run was launched successfully
      - run launch failed with error
  */

  const dispatch = useDispatch()
  const launchRunProcessing = () => {
    dispatch(launchExperimentRun(experimentRun.id))
  }

  const flushLaunch = () => {
    dispatch(flushExperimentRunLaunch(experimentRun.id))
  }

  const launchDate = experimentRun.run_processing_launch_date ?
    moment(experimentRun.run_processing_launch_date).format("YYYY-MM-DD LT")
    : '2022-11-12'

  if (experimentRunLaunch) {
    switch(experimentRunLaunch.status) {
      case LAUNCH_STATUS.LAUNCHING: {
        return (
          <Spin size='small'/>
        )
      }
      case LAUNCH_STATUS.LAUNCHED: {
        return (
          <div>
            <Button icon={<CloseSquareOutlined/>} type="text" onClick={flushLaunch}/><Text type='success'>Launched Successfully</Text>
            
          </div>
        )
      }
      case LAUNCH_STATUS.ERROR: {
        return (
          <>
            <Button icon={<CloseSquareOutlined/>} type="text" onClick={flushLaunch}/>
            <Space><WarningOutlined/><Text type='danger'>Launch Failed</Text></Space>
          </>
        )
      }
    }
    
  } else {
    // User has not launched the run since the page was loaded
    if(experimentRun.run_processing_launch_date) {
      return (
        <>
          <Button type="primary" onClick={launchRunProcessing}>Relaunch Run</Button>
          {/* { launchDate && <Text>{launchDate}</Text>} */}
        </>
      )
    } else {
      return (
        <>
          <Button type="primary" onClick={launchRunProcessing}>Launch Run</Button>
          {/* { launchDate && <div><Text>{launchDate}</Text></div>} */}
        </>
        
      ) 
    }
  }
}

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  containersByID: state.containers.itemsByID,
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
  token,
  containersByID,
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
  actions,
  listTable,
  setFilter,
  setFilterOption,
  clearFilters,
  setSortBy,
}) => {

  

  const listExport = () =>
    withToken(token, api.experimentRuns.listExport)
    (mergedListQueryParams(EXPERIMENT_RUN_FILTERS, filters, sortBy))
      .then(response => response.data)

  const columns = getTableColumns(containersByID, runTypes, instruments, launchesById)
  .map(c => Object.assign(c, getFilterProps(
    c,
    EXPERIMENT_RUN_FILTERS,
    filters,
    setFilter,
    setFilterOption
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
          onClick={clearFilters}
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
        onLoad={listTable}
        onChangeSort={setSortBy}
      />
    </PageContent>
  </>;
};

export default connect(mapStateToProps, mapDispatchToProps)(ExperimentRunsListContent);
