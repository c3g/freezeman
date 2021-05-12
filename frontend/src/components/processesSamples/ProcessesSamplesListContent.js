import React, {useRef} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import ExportButton from "../ExportButton";

import api, {withToken}  from "../../utils/api"

import {listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/processesSamples/actions";
import {actionsToButtonList} from "../../utils/templateActions";
import {withSample} from "../../utils/withItem";
import mergedListQueryParams from "../../utils/mergedListQueryParams";
import {PROCESS_SAMPLE_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import FiltersWarning from "../filters/FiltersWarning";

const getTableColumns = (samplesByID, protocols) => [
    {
      title: "Process ID",
      dataIndex: "process",
      sorter: true,
      width: 150,
      render: (_, processSample) =>
          <Link to={`/processes/${processSample.id}`}>{processSample.process}</Link>
    },
    {
      title: "Protocol",
      dataIndex: "process__protocol__name",
      sorter: true,
      width: 200,
      options: protocols.items.map(x => ({ label: x.name, value: x.name })), // for getFilterProps
      render: (_, processSample) =>
          <Tag>{protocols?.itemsByID[processSample.protocol]?.name}</Tag>,
    },
    {
      title: "Source Sample",
      dataIndex: "source_sample__name",
      sorter: true,
      render: (_, processSample) => {
        const sample = processSample.source_sample
        return (sample &&
          <Link to={`/samples/${sample}`}>
            {withSample(samplesByID, sample, sample => sample.name, "loading...")}
          </Link>)
      }
    },
    {
      title: "Generated Sample",
      dataIndex: "lineage__child__name",
      sorter: true,
      render: (_, processSample) => {
        const sample = processSample.child_sample
        return (sample &&
          <Link to={`/samples/${sample}`}>
            {withSample(samplesByID, sample, sample => sample.name, "loading...")}
          </Link>)
      }
    },
    {
      title: "Volume Used (µL)",
      dataIndex: "volume_used",
      sorter: true,
      align: "right",
      className: "table-column-numbers",
      width: 180,
    },
    {
      title: "Date Processed",
      dataIndex: "execution_date",
      sorter: true,
      width: 180,
    },
  ];

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  processesSamplesByID: state.processesSamples.itemsByID,
  processesSamples: state.processesSamples.items,
  protocols: state.protocols,
  actions: state.processSampleTemplateActions,
  page: state.processesSamples.page,
  totalCount: state.processesSamples.totalCount,
  isFetching: state.processesSamples.isFetching,
  filters: state.processesSamples.filters,
  samplesByID: state.samples.itemsByID,
  sortBy: state.processesSamples.sortBy,
});

const actionCreators = {listTable, setFilter, setFilterOption, clearFilters, setSortBy};

const ProcessesSamplesListContent = ({
  token,
  processesSamples,
  processesSamplesByID,
  protocols,
  actions,
  isFetching,
  page,
  totalCount,
  filters,
  samplesByID,
  sortBy,
  listTable,
  setFilter,
  setFilterOption,
  clearFilters,
  setSortBy,
}) => {

  const listExport = () =>
    withToken(token, api.processesSamples.listExport)
    (mergedListQueryParams(PROCESS_SAMPLE_FILTERS, filters, sortBy))
      .then(response => response.data)

  const columns = getTableColumns(samplesByID, protocols)
  .map(c => Object.assign(c, getFilterProps(
    c,
    PROCESS_SAMPLE_FILTERS,
    filters,
    setFilter,
    setFilterOption
  )))

  const nFilters = getNFilters(filters)

  return <>
    <AppPageHeader title="Protocols" extra={[
      ...actionsToButtonList("/processes-samples", actions),
      <ExportButton key='export' exportFunction={listExport} filename="processesSamples"  itemsCount={totalCount}/>,
    ]}/>
    <PageContent>
      <div style={{ textAlign: 'right', marginBottom: '1em' }}>
        <FiltersWarning
          nFilters={nFilters}
          filters={filters}
          description={PROCESS_SAMPLE_FILTERS}
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
        items={processesSamples}
        itemsByID={processesSamplesByID}
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

export default connect(mapStateToProps, actionCreators)(ProcessesSamplesListContent);
