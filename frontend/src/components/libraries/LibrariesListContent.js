import React, {useRef} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import {SampleDepletion} from "./SampleDepletion";
import {QCFlag} from "./QCFlag";
import ExportButton from "../ExportButton";

import api, {withToken}  from "../../utils/api"

import {listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/samples/actions";
import {actionDropdown} from "../../utils/templateActions";
import {prefillTemplatesToButtonDropdown} from "../../utils/prefillTemplates";
import {withContainer, withLibraryType, withIndex, withPlatform} from "../../utils/withItem";
import {LIBRARY_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import FiltersWarning from "../filters/FiltersWarning";
import mergedListQueryParams from "../../utils/mergedListQueryParams";

const getTableColumns = (containersByID, indicesByID, libraryTypesByID, PlatformsByID) => [
    {
      title: "ID",
      dataIndex: "id",
      sorter: true,
      width: 90,
      render: (_, library) =>
        <Link to={`/samples/${library.id}`}>
          <div>{library.id}</div>
        </Link>,
    },
    {
      title: "Name",
      dataIndex: "name",
      sorter: true,
      render: (name, library) =>
        <Link to={`/samples/${library.id}`}>
          <div>{name}</div>
        </Link>,
    },
    {
      title: "Container Barcode",
      dataIndex: "container__barcode",
      sorter: true,
      render: (_, library) => (library.container &&
        <Link to={`/containers/${library.container}`}>
          {withContainer(containersByID, library.container, container => container.barcode, "loading...")}
        </Link>),
    },
    {
      title: "Coords",
      dataIndex: "coordinates",
      sorter: true,
      width: 70,
    },
    {
      title: "Library Type",
      dataIndex: "derived_samples__library__library_type__name",
      sorter: true,
      render: (_, library) => (library.library_type &&
        <div>
          {withLibraryType(libraryTypesByID, library.library_type, library_type => library_type.name, "loading...")}
        </div>),
    },
    {
      title: "Index",
      dataIndex: "derived_samples__library__index__name",
      sorter: true,
      render: (_, library) => (library.index &&
        <div>
          {withIndex(indicesByID, library.index, index => index.name, "loading...")}
        </div>),
    },
    {
      title: "Platform",
      dataIndex: "derived_samples__library__platform__name",
      sorter: true,
      render: (_, library) => (library.platform &&
        <div>
          {withPlatform(platformsByID, library.platform, platform => platform.name, "loading...")}
        </div>),
    },
    {
      title: "Projects",
      dataIndex: "projects__name",
      render: (_, library) => (library.projects &&
        library.projects.map(id => {
          return (<div> <Link to={`/projects/${id}`}> {projectsByID[id]?.name} </Link> </div>);
        })
      ),
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
      dataIndex: "concentration_ng_ul",
      sorter: true,
      align: "right",
      className: "table-column-numbers",
      render: conc => conc !== null ? parseFloat(conc).toFixed(3) : null,
      width: 115,
    },
    {
      title: "Conc. (nM)",
      dataIndex: "concentration_nm",
      sorter: true,
      align: "right",
      className: "table-column-numbers",
      render: conc => conc !== null ? parseFloat(conc).toFixed(3) : null,
      width: 115,
    },
    {
      title: "Qty (ng)",
      dataIndex: "quantity_ng",
      sorter: true,
      align: "right",
      className: "table-column-numbers",
      render: qty => qty !== null ? parseFloat(qty).toFixed(3) : null,
      width: 115,
    },
    {
      title: "Library Size",
      dataIndex: "derived_samples__library__library_size",
      sorter: true,
      align: "right",
      className: "table-column-numbers",
      render: size => size !== null ? parseInt(size) : null,
      width: 80,
    },
    {
      title: "QC Flag",
      dataIndex: "qc_flag",
      sorter: true,
      render: (_, library) => {
        const flags = { quantity: library.quantity_flag, quality: library.quality_flag };
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
  librariesByID: state.libraries.itemsByID,
  libraries: state.libraries.items,
  actions: state.libraryTemplateActions,
  prefills: state.libraryPrefillTemplates,
  page: state.libraries.page,
  totalCount: state.libraries.totalCount,
  isFetching: state.libraries.isFetching,
  filters: state.libraries.filters,
  containersByID: state.containers.itemsByID,
  projectsByID: state.projects.itemsByID,
  sortBy: state.samples.sortBy,
});

const actionCreators = {listTable, setFilter, setFilterOption, clearFilters, setSortBy};

const SamplesListContent = ({
  token,
  libraries,
  librariesByID,
  actions,
  prefills,
  isFetching,
  page,
  totalCount,
  filters,
  containersByID,
  projectsByID,
  sortBy,
  listTable,
  setFilter,
  setFilterOption,
  clearFilters,
  setSortBy,
}) => {

  const listExport = () =>
    withToken(token, api.libraries.listExport)
    (mergedListQueryParams(LIBRARY_FILTERS, filters, sortBy))
      .then(response => response.data)

  const prefillTemplate = ({template}) =>
    withToken(token, api.libraries.prefill.request)
    (mergedListQueryParams(LIBRARY_FILTERS, filters, sortBy), template)
      .then(response => response)

  const columns = getTableColumns(containersByID, projectsByID)
  .map(c => Object.assign(c, getFilterProps(
    c,
    SAMPLE_FILTERS,
    filters,
    setFilter,
    setFilterOption
  )))

  const nFilters = getNFilters(filters)

  return <>
    <AppPageHeader title="Libraries" extra={[
      actionDropdown("/libraries", actions),
      prefillTemplatesToButtonDropdown(prefillTemplate, totalCount, prefills),
      <ExportButton key='export' exportFunction={listExport} filename="libraries" itemsCount={totalCount}/>,
    ]}/>
    <PageContent>
      <div style={{ display: 'flex', textAlign: 'right', marginBottom: '1em' }}>
        <FiltersWarning
          nFilters={nFilters}
          filters={filters}
          description={LIBRARY_FILTERS}
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
        items={libraries}
        itemsByID={librariesByID}
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

export default connect(mapStateToProps, actionCreators)(LibrariesListContent);
