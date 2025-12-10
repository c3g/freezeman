import React, {useEffect, useRef} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import ExportButton from "../ExportButton";

import api, {withToken}  from "../../utils/api"

import {listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/processMeasurements/actions";
import {ActionDropdown} from "../../utils/templateActions";
import mergedListQueryParams from "../../utils/mergedListQueryParams";
import {PROCESS_MEASUREMENT_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import FiltersWarning from "../filters/FiltersWarning";
import { WithSampleRenderComponent} from '../shared/WithItemRenderComponent'

const getTableColumns = (protocols) => [
    {
      title: "ID",
      dataIndex: "id",
      sorter: true,
      width: 150,
      render: (_, processMeasurement) =>
          <Link to={`/process-measurements/${processMeasurement.id}`}>{processMeasurement.id}</Link>
    },
    {
      title: "Process ID",
      dataIndex: "process",
      sorter: true,
      width: 150,
      render: (_, processMeasurement) =>
          <Link to={`/processes/${processMeasurement.process}`}>{processMeasurement.process}</Link>
    },
    {
      title: "Protocol",
      dataIndex: "process__protocol__name",
      sorter: true,
      width: 200,
      options: protocols.items.map(x => ({ label: x.name, value: x.name })), // for getFilterProps
      render: (_, processMeasurement) =>
          <Tag variant="outlined">{protocols?.itemsByID[processMeasurement.protocol]?.name}</Tag>,
    },
    {
      title: "Source Sample",
      dataIndex: "source_sample__name",
      sorter: true,
      render: (_, processMeasurement) => {
        const sample = processMeasurement.source_sample
        return (sample &&
          <Link to={`/samples/${sample}`}>
            <WithSampleRenderComponent objectID={sample} placeholder={"loading..."} render={sample => sample.name}/>
          </Link>)
      }
    },
    {
      title: "Generated Sample",
      dataIndex: "lineage__child__name",
      sorter: true,
      render: (_, processMeasurement) => {
        const sample = processMeasurement.child_sample
        return (sample &&
          <Link to={`/samples/${sample}`}>
            <WithSampleRenderComponent objectID={sample} placeholder={"loading..."} render={sample => sample.name}/>
          </Link>)
      }
    },
    {
      title: "Volume Used (µL)",
      dataIndex: "volume_used",
      sorter: true,
      align: "right",
      width: 180,
    },
    {
      title: "Date Processed",
      dataIndex: "execution_date",
      sorter: true,
      width: 180,
    },
  ];

/**
 * @typedef {import("../../store").RootState} RootState
 * @typedef {{
 *   token: RootState['auth']['tokens']['access']
 *   processMeasurementsByID: RootState['processMeasurements']['itemsByID']
 *   processMeasurements: RootState['processMeasurements']['items']
 *   protocols: RootState['protocols']
 *   actions: RootState['processMeasurementTemplateActions']
 *   page: RootState['processMeasurements']['page']
 *   totalCount: RootState['processMeasurements']['totalCount']
 *   isFetching: RootState['processMeasurements']['isFetching']
 *   filters: RootState['processMeasurements']['filters']
 *   sortBy: RootState['processMeasurements']['sortBy']
 * }} ProcessMeasurementsListContentStateProps
 * @typedef {{
 *   listTable: typeof listTable
 *   setFilter: typeof setFilter
 *   setFilterOption: typeof setFilterOption
 *   clearFilters: typeof clearFilters
 *   setSortBy: typeof setSortBy
 * }} ProcessMeasurementsListContentDispatchedProps
 * @typedef {ProcessMeasurementsListContentStateProps & ProcessMeasurementsListContentDispatchedProps} ProcessMeasurementsListContentProps
 */

/**
 * 
 * @param {RootState} state 
 * @returns {ProcessMeasurementsListContentStateProps}
 */
const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  processMeasurementsByID: state.processMeasurements.itemsByID,
  processMeasurements: state.processMeasurements.items,
  protocols: state.protocols,
  actions: state.processMeasurementTemplateActions,
  page: state.processMeasurements.page,
  totalCount: state.processMeasurements.totalCount,
  isFetching: state.processMeasurements.isFetching,
  filters: state.processMeasurements.filters,
  sortBy: state.processMeasurements.sortBy,
});

/**
 * @type {ProcessMeasurementsListContentDispatchedProps}
 */
const actionCreators = {listTable, setFilter, setFilterOption, clearFilters, setSortBy};

/**
 * @param {ProcessMeasurementsListContentProps} props
 */
const ProcessMeasurementsListContent = ({
  token,
  processMeasurements,
  processMeasurementsByID,
  protocols,
  actions,
  isFetching,
  page,
  totalCount,
  filters,
  sortBy,
  listTable,
  setFilter,
  setFilterOption,
  clearFilters,
  setSortBy,
}) => {
  useEffect(() => {
    listTable()
  }, [listTable])

  const listExport = () =>
    withToken(token, api.processMeasurements.listExport)
    (mergedListQueryParams(PROCESS_MEASUREMENT_FILTERS, filters, sortBy))
      .then(response => response.data)

  protocols.items = protocols.items
  .filter(protocol => protocol.child_of?.length === 0)

  const columns = getTableColumns(protocols)
  .map(c => Object.assign(c, getFilterProps(
    c,
    PROCESS_MEASUREMENT_FILTERS,
    filters,
    setFilter,
    setFilterOption
  )))

  const nFilters = getNFilters(filters)

  return <>
    <AppPageHeader title="Protocols" extra={[
      <ActionDropdown key='actions' urlBase={"/process-measurements"} actions={actions}/>,
      <ExportButton key='export' exportFunction={listExport} filename="processes"  itemsCount={totalCount}/>,
    ]}/>
    <PageContent>
      <div className='filters-warning-bar'>
        <FiltersWarning
          nFilters={nFilters}
          filters={filters}
          description={PROCESS_MEASUREMENT_FILTERS}
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
        items={processMeasurements}
        itemsByID={processMeasurementsByID}
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

export default connect(mapStateToProps, actionCreators)(ProcessMeasurementsListContent);
