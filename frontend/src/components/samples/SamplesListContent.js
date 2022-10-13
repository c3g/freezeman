import React, {useRef, useState, useEffect} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag, Radio} from "antd";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import {Depletion} from "../Depletion";
import {QCFlag} from "../QCFlag";
import AddButton from "../AddButton";
import ExportButton from "../ExportButton";

import api, {withToken}  from "../../utils/api"

import {listTable, setFilter, setFilterOption, clearFilters, setSortBy, setSortByWithoutList} from "../../modules/samples/actions";
import {actionDropdown} from "../../utils/templateActions";
import {prefillTemplatesToButtonDropdown} from "../../utils/prefillTemplates";
import {withContainer, withIndividual} from "../../utils/withItem";
import {SAMPLE_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import FiltersWarning from "../filters/FiltersWarning";
import SamplesFilters from "./SamplesFilters";
import mergedListQueryParams from "../../utils/mergedListQueryParams";
import {TOGGLE_OPTIONS} from "../../constants.js"

const getTableColumns = (containersByID, individualsByID, projectsByID, sampleKinds, toggleOption) => [
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
      sorter: toggleOption === TOGGLE_OPTIONS.SAMPLES ? true : false,
      width: 80,
      options: sampleKinds.items.map(x => ({ label: x.name, value: x.name })), // for getFilterProps
      render: (_, sample) =>
        <Tag>{sample.sample_kind ? sampleKinds.itemsByID[sample.sample_kind]?.name : "POOL"}</Tag>,
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
      sorter: toggleOption === TOGGLE_OPTIONS.SAMPLES ? true : false,
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
      title: "Project",
      dataIndex: "derived_samples__project__name",
      sorter: toggleOption === TOGGLE_OPTIONS.SAMPLES ? true : false,
      render: (_, sample) => {
        return (sample.project &&
          <Link to={`/projects/${sample.project}`}>
            {projectsByID[sample.project]?.name}
          </Link>)
      }
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
      render: depleted => <Depletion depleted={depleted} />,
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

const actionCreators = {listTable, setFilter, setFilterOption, clearFilters, setSortBy, setSortByWithoutList};

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
  setSortByWithoutList,
}) => {

  const isPooledFilterKey = SAMPLE_FILTERS.is_pooled.key

  function getCurrentToggleOption(){
    if (filters[isPooledFilterKey]?.value === "true") return TOGGLE_OPTIONS.POOLS
    else if (filters[isPooledFilterKey]?.value === "false") return TOGGLE_OPTIONS.SAMPLES
    else return TOGGLE_OPTIONS.ALL
  }
  // Check if there's a is_pool filter applied before showing the list (important when user changes page)
  const initialToggleOption = getCurrentToggleOption()

  // Show both samples and pools as default
  const [columns, setColumns] = useState(getTableColumns(containersByID, individualsByID, projectsByID, sampleKinds, toggleOption));
  const [toggleOption, setToggleOption] = useState(initialToggleOption);

  const listExport = () =>
    withToken(token, api.samples.listExport)
    (mergedListQueryParams(SAMPLE_FILTERS, filters, sortBy))
      .then(response => response.data)

  const prefillTemplate = ({template}) =>
    withToken(token, api.samples.prefill.request)
    (mergedListQueryParams(SAMPLE_FILTERS, filters, sortBy), template)
      .then(response => response)

  const nFilters = getNFilters(filters)

  // Listen to the changes in toggle to get new columns and set filters accordingly
  useEffect(() => {
    // Get the new columns depending on the new option
    setColumns(getTableColumns(containersByID, individualsByID, projectsByID, sampleKinds, toggleOption))

    // Only apply filters if the new selected option is different from the current one
    if (getCurrentToggleOption() !== toggleOption){
      // Need to reset the sortBy when there's a new toggle option to avoid problems
      setSortByWithoutList('', '')

      if (toggleOption !== TOGGLE_OPTIONS.ALL)
        setFilter(isPooledFilterKey, toggleOption === TOGGLE_OPTIONS.POOLS ? "true" : "false")
      else
        setFilter(isPooledFilterKey, '')
    }
  }, [toggleOption, containersByID, individualsByID, projectsByID, sampleKinds])

  const handleToggleOptionChange = (e) => {
      setToggleOption(e.target.value);
  };

  // Design decision: If the user clears all filters return to displaying all
  const localClearFilters = () => {
    clearFilters()
    setToggleOption(TOGGLE_OPTIONS.ALL)
  }

  const mappedColumns = columns.map(c => Object.assign(c, getFilterProps(
    c,
    SAMPLE_FILTERS,
    filters,
    setFilter,
    setFilterOption
  )))

  return <>
    <AppPageHeader title="Samples" extra={[
      <AddButton key='add' url="/samples/add" />,
      actionDropdown("/samples", actions),
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
          onClick={localClearFilters}
        >
          Clear Filters
        </Button>
      </div>
      <Radio.Group disabled={isFetching} value={toggleOption} onChange={handleToggleOptionChange} style={{marginBottom: '1rem', displey: 'flex'}}>
         <Radio.Button value={TOGGLE_OPTIONS.SAMPLES}> Samples </Radio.Button>
         <Radio.Button value={TOGGLE_OPTIONS.POOLS}> Pools </Radio.Button>
         <Radio.Button value={TOGGLE_OPTIONS.ALL}> All </Radio.Button>
      </Radio.Group>
      <PaginatedTable
        columns={mappedColumns}
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
