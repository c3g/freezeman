import { useDispatch, useSelector } from "react-redux"
import React, {useRef} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import ExportButton from "../ExportButton";

import api, {withToken}  from "../../utils/api"

import {listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/processMeasurements/actions";
import {actionDropdown} from "../../utils/templateActions";
import {withSample} from "../../utils/withItem";
import mergedListQueryParams from "../../utils/mergedListQueryParams";
import {PROCESS_MEASUREMENT_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import FiltersWarning from "../filters/FiltersWarning";

const getTableColumns = (samplesByID, protocols) => [
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
          <Tag>{protocols?.itemsByID[processMeasurement.protocol]?.name}</Tag>,
    },
    {
      title: "Source Sample",
      dataIndex: "source_sample__name",
      sorter: true,
      render: (_, processMeasurement) => {
        const sample = processMeasurement.source_sample
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
      render: (_, processMeasurement) => {
        const sample = processMeasurement.child_sample
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
      width: 180,
    },
    {
      title: "Date Processed",
      dataIndex: "execution_date",
      sorter: true,
      width: 180,
    },
  ];





const ProcessMeasurementsListContent = ({  }) => {

  const token = useSelector((state) => state.auth.tokens.access)
  const processMeasurementsByID = useSelector((state) => state.processMeasurements.itemsByID)
  const processMeasurements = useSelector((state) => state.processMeasurements.items)
  const protocols = useSelector((state) => state.protocols)
  const actions = useSelector((state) => state.processMeasurementTemplateActions)
  const page = useSelector((state) => state.processMeasurements.page)
  const totalCount = useSelector((state) => state.processMeasurements.totalCount)
  const isFetching = useSelector((state) => state.processMeasurements.isFetching)
  const filters = useSelector((state) => state.processMeasurements.filters)
  const samplesByID = useSelector((state) => state.samples.itemsByID)
  const sortBy = useSelector((state) => state.processMeasurements.sortBy)
  const dispatch = useDispatch()
  const dispatchListTable = useCallback((...args) => listTable(...args), [dispatch])
  const dispatchSetFilter = useCallback((...args) => setFilter(...args), [dispatch])
  const dispatchSetFilterOption = useCallback((...args) => setFilterOption(...args), [dispatch])
  const dispatchClearFilters = useCallback((...args) => clearFilters(...args), [dispatch])
  const dispatchSetSortBy = useCallback((...args) => setSortBy(...args), [dispatch])

  const listExport = () =>
    withToken(token, api.processMeasurements.listExport)
    (mergedListQueryParams(PROCESS_MEASUREMENT_FILTERS, filters, sortBy))
      .then(response => response.data)

  protocols.items = protocols.items
  .filter(protocol => protocol.child_of?.length === 0)

  const columns = getTableColumns(samplesByID, protocols)
  .map(c => Object.assign(c, getFilterProps(
    c,
    PROCESS_MEASUREMENT_FILTERS,
    filters,
    dispatchSetFilter,
    dispatchSetFilterOption
  )))

  const nFilters = getNFilters(filters)

  return <>
    <AppPageHeader title="Protocols" extra={[
      actionDropdown("/process-measurements", actions),
      <ExportButton key='export' exportFunction={listExport} filename="processes"  itemsCount={totalCount}/>,
    ]}/>
    <PageContent>
      <div style={{ textAlign: 'right', marginBottom: '1em' }}>
        <FiltersWarning
          nFilters={nFilters}
          filters={filters}
          description={PROCESS_MEASUREMENT_FILTERS}
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
        items={processMeasurements}
        itemsByID={processMeasurementsByID}
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

export default ProcessMeasurementsListContent;
