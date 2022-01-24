import React, {useRef} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import {SampleDepletion} from "./SampleDepletion";
import {QCFlag} from "./QCFlag";
import AddButton from "../AddButton";
import ExportButton from "../ExportButton";

import api, {withToken}  from "../../utils/api"

import {listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/samples/actions";
import {actionsToButtonList} from "../../utils/templateActions";
import {prefillTemplatesToButtonDropdown} from "../../utils/prefillTemplates";
import {withContainer, withIndividual} from "../../utils/withItem";
import {SAMPLE_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import FiltersWarning from "../filters/FiltersWarning";
import SamplesFilters from "./SamplesFilters";
import mergedListQueryParams from "../../utils/mergedListQueryParams";

const getTableColumns = (containersByID, individualsByID, projectsByID, sampleKinds) => [
    {
      title: "ID",
      dataIndex: "id",
      sorter: true,
      width: 90,
      render: (_, sample) =>
        <Link to={`/samples/${sample.id}`}>
          <div>{sample.id}</div>
        </Link>,
    },
    {
      title: "Kind",
      dataIndex: "derived_samples__sample_kind__name",
      sorter: true,
      width: 80,
      options: sampleKinds.items.map(x => ({ label: x.name, value: x.name })), // for getFilterProps
      render: (_, sample) =>
        <Tag>{sampleKinds.itemsByID[sample.sample_kind]?.name}</Tag>,
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
      dataIndex: "derived_samples__biosample__individual__name",
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
      title: "Projects",
      dataIndex: "projects__name",
      render: (_, sample) => (sample.projects &&
        sample.projects.map(id => {
          return (<div> <Link to={`/projects/${id}`}> {projectsByID[id]?.name} </Link> </div>);
        })
      ),
    },
    {
      title: "Coords",
      dataIndex: "coordinates",
      sorter: true,
      width: 70,
    },
    {
      title: "Vol. (µL)",
      dataIndex: "volume",
      sorter: true,
      align: "right",
      className: "table-column-numbers",
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
      title: "QC Flag",
      dataIndex: "qc_flag",
      sorter: true,
      render: (_, sample) => {
        const flags = { quantity: sample.quantity_flag, quality: sample.quality_flag };
        if (flags.quantity !== null && flags.quality !== null)
          return <QCFlag flags={flags}/>;
        else
          return null;
      }
    },
    {
      title: "Creation Date",
      dataIndex: "creation_date",
      sorter: true,
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
  sampleKinds: state.sampleKinds,
  actions: state.sampleTemplateActions,
  prefills: state.samplePrefillTemplates,
  page: state.samples.page,
  totalCount: state.samples.totalCount,
  isFetching: state.samples.isFetching,
  filters: state.samples.filters,
  containersByID: state.containers.itemsByID,
  individualsByID: state.individuals.itemsByID,
  projectsByID: state.projects.itemsByID,
  sortBy: state.samples.sortBy,
});

const actionCreators = {listTable, setFilter, setFilterOption, clearFilters, setSortBy};

const SamplesListContent = ({
  token,
  samples,
  samplesByID,
  sampleKinds,
  actions,
  prefills,
  isFetching,
  page,
  totalCount,
  filters,
  containersByID,
  individualsByID,
  projectsByID,
  sortBy,
  listTable,
  setFilter,
  setFilterOption,
  clearFilters,
  setSortBy,
}) => {

  const listExport = () =>
    withToken(token, api.samples.listExport)
    (mergedListQueryParams(SAMPLE_FILTERS, filters, sortBy))
      .then(response => response.data)

  const prefillTemplate = ({template}) =>
    withToken(token, api.samples.prefill.request)
    (mergedListQueryParams(SAMPLE_FILTERS, filters, sortBy), template)
      .then(response => response.data)

  const columns = getTableColumns(containersByID, individualsByID, projectsByID, sampleKinds)
  .map(c => Object.assign(c, getFilterProps(
    c,
    SAMPLE_FILTERS,
    filters,
    setFilter,
    setFilterOption
  )))

  const nFilters = getNFilters(filters)

  return <>
    <AppPageHeader title="Samples" extra={[
      <AddButton key='add' url="/samples/add" />,
      ...actionsToButtonList("/samples", actions),
      prefillTemplatesToButtonDropdown(prefillTemplate, totalCount, prefills),
      <ExportButton key='export' exportFunction={listExport} filename="samples" itemsCount={totalCount}/>,
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
        onLoad={listTable}
        onChangeSort={setSortBy}
      />
    </PageContent>
  </>;
}

export default connect(mapStateToProps, actionCreators)(SamplesListContent);
