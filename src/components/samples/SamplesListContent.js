import React, {useRef} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";

import {Button, Tag} from "antd";
import "antd/es/button/style/css";
import "antd/es/tag/style/css";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import {SampleDepletion} from "./SampleDepletion";
import AddButton from "../AddButton";
import ExportButton from "../ExportButton";

import api, {withToken}  from "../../utils/api"

import {list, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/samples/actions";
import {actionsToButtonList} from "../../utils/templateActions";
import {withContainer, withIndividual} from "../../utils/withItem";
import {SAMPLE_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import FiltersWarning from "../filters/FiltersWarning";
import SamplesFilters from "./SamplesFilters";
import mergedListQueryParams from "../../utils/mergedListQueryParams";

const getTableColumns = (containersByID, individualsByID) => [
    {
      title: "Type",
      dataIndex: "biospecimen_type",
      sorter: true,
      width: 80,
      render: (type) => <Tag>{type}</Tag>,
    },
    {
      title: "Name",
      dataIndex: "name",
      sorter: true,
      render: (name, sample) =>
        <Link to={`/samples/${sample.id}`}>
          <div>{name}</div>
          {sample.alias &&
            <div><small>alias: {sample.alias}</small></div>
          }
        </Link>,
    },
    {
      title: "Individual",
      dataIndex: "individual__name",
      sorter: true,
      render: (_, sample) => {
        const individual = sample.individual
        return (individual &&
          <Link to={`/individuals/${individual}`}>
            {withIndividual(individualsByID, individual, individual => individual.name, "loading...")}
          </Link>)
      }
    },
    {
      title: "Container Name",
      dataIndex: "container__name",
      sorter: true,
      render: (_, sample) =>
        (sample.container &&
          withContainer(containersByID, sample.container, container => container.name, "loading...")),
    },
    {
      title: "Container Barcode",
      dataIndex: "container__barcode",
      sorter: true,
      render: (_, sample) => (sample.container &&
        <Link to={`/containers/${sample.container}`}>
          {withContainer(containersByID, sample.container, container => container.barcode, "loading...")}
        </Link>),
    },
    {
      title: "Coords",
      dataIndex: "coordinates",
      sorter: true,
      width: 70,
    },
    {
      title: "Vol. (µL)",
      dataIndex: "volume_history",
      align: "right",
      className: "table-column-numbers",
      render: vh => parseFloat(vh[vh.length - 1].volume_value).toFixed(3),
      width: 100,
    },
    {
      title: "Conc. (ng/µL)",
      dataIndex: "concentration",
      sorter: true,
      align: "right",
      className: "table-column-numbers",
      render: conc => conc !== null ? parseFloat(conc).toFixed(3) : null,
      width: 115,
    },
    {
      title: "Depleted",
      dataIndex: "depleted",
      sorter: true,
      render: depleted => <SampleDepletion depleted={depleted} />,
      width: 85,
    }
  ];

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  samplesByID: state.samples.itemsByID,
  samples: state.samples.items,
  actions: state.sampleTemplateActions,
  page: state.samples.page,
  totalCount: state.samples.totalCount,
  isFetching: state.samples.isFetching,
  filters: state.samples.filters,
  containersByID: state.containers.itemsByID,
  individualsByID: state.individuals.itemsByID,
  sortBy: state.samples.sortBy,
});

const actionCreators = {list, setFilter, setFilterOption, clearFilters, setSortBy};

const SamplesListContent = ({
  token,
  samples,
  samplesByID,
  actions,
  isFetching,
  page,
  totalCount,
  filters,
  containersByID,
  individualsByID,
  sortBy,
  list,
  setFilter,
  setFilterOption,
  clearFilters,
  setSortBy,
}) => {

  const listExport = () =>
    withToken(token, api.samples.listExport)
    (mergedListQueryParams(SAMPLE_FILTERS, filters, sortBy))
      .then(response => response.data)

  const columns = getTableColumns(containersByID, individualsByID)
  .map(c => Object.assign(c, getFilterProps(
    c,
    SAMPLE_FILTERS,
    filters,
    setFilter,
    setFilterOption
  )))

  const nFilters = getNFilters(filters)

  return <>
    <AppPageHeader title="Samples & Extractions" extra={[
      <AddButton key='add' url="/samples/add" />,
      ...actionsToButtonList("/samples", actions),
      <ExportButton key='export' exportFunction={listExport} filename="samples"/>,
    ]}/>
    <PageContent>
      <div style={{ display: 'flex', textAlign: 'right', marginBottom: '1em' }}>
        <SamplesFilters style={{ flex: 1 }} />
        <FiltersWarning
          nFilters={nFilters}
          filters={filters}
          description={SAMPLE_FILTERS}
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
        items={samples}
        itemsByID={samplesByID}
        rowKey="id"
        loading={isFetching}
        totalCount={totalCount}
        page={page}
        filters={filters}
        sortBy={sortBy}
        onLoad={list}
        onChangeSort={setSortBy}
      />
    </PageContent>
  </>;
}

export default connect(mapStateToProps, actionCreators)(SamplesListContent);
