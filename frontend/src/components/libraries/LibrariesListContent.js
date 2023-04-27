import React, {useState, useEffect} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Radio} from "antd";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import {Depletion} from "../Depletion";
import {QCFlag} from "../QCFlag";
import ExportButton from "../ExportButton";

import api, {withToken}  from "../../utils/api"

import {listTable, setFilter, setFilterOption, clearFilters, setSortBy, clearSortBy} from "../../modules/libraries/actions";
import {ActionDropdown} from "../../utils/templateActions";
import {PrefilledTemplatesDropdown} from "../../utils/prefillTemplates";
import {withContainer, withCoordinate, withIndex} from "../../utils/withItem";
import {LIBRARY_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import FiltersWarning from "../filters/FiltersWarning";
import mergedListQueryParams from "../../utils/mergedListQueryParams";
import {TOGGLE_OPTIONS} from "../../constants.js"

const getTableColumns = (containersByID, indicesByID, projectsByID, coordinatesByID, toggleOption) => [
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
      title: "Platform",
      dataIndex: "derived_samples__library__platform__name",
      sorter: toggleOption === TOGGLE_OPTIONS.LIBRARIES ? true : false,
      render: (_, library) => (library.platform &&
        <div>
          {library.platform}
        </div>),
    },
    {
      title: "Project",
      dataIndex: "derived_samples__project__name",
      sorter: toggleOption === TOGGLE_OPTIONS.LIBRARIES ? true : false,
      render: (_, library) => {
        return (library.project &&
          <Link to={`/projects/${library.project}`}>
            {projectsByID[library.project]?.name}
          </Link>)
      }
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
      dataIndex: "coordinate__name",
      sorter: true,
      render: (_, library) => (library.coordinate && withCoordinate(coordinatesByID, library.coordinate, coordinate => coordinate.name, "loading...")),
      width: 70,
    },
    {
      title: "Library Type",
      dataIndex: "derived_samples__library__library_type__name",
      sorter: toggleOption === TOGGLE_OPTIONS.LIBRARIES ? true : false,
      render: (_, library) => (library.library_type &&
        <div>
          {library.library_type}
        </div>),
    },
    {
      title: "Selection Target",
      dataIndex: "derived_samples__library__library_selection__target",
      sorter: toggleOption === TOGGLE_OPTIONS.LIBRARIES ? true : false,
      render: (_, library) => (library.library_selection_target &&
        <div>
          {library.library_selection_target}
        </div>),
    },
    {
      title: "Index",
      dataIndex: "derived_samples__library__index__name",
      sorter: toggleOption === TOGGLE_OPTIONS.LIBRARIES ? true : false,
      render: (_, library) => (library.index &&
        <Link to={`/indices/${library.index}`}>
          {withIndex(indicesByID, library.index, index => index.name, "loading...")}
        </Link>),
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
      title: "Library Size",
      dataIndex: "derived_samples__library__library_size",
      sorter: toggleOption === TOGGLE_OPTIONS.LIBRARIES ? true : false,
      align: "right",
      className: "table-column-numbers",
      render: (_, library) => library.library_size !== null ? parseInt(library.library_size) : null,
      width: 80,
    },
    {
      title: "Conc. (nM)",
      dataIndex: "concentration_nm",
      align: "right",
      className: "table-column-numbers",
      render: conc => conc !== null ? parseFloat(conc).toFixed(3) : null,
      width: 115,
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
      title: "NA Qty (ng)",
      dataIndex: "quantity_ng",
      sorter: true,
      align: "right",
      className: "table-column-numbers",
      render: qty => qty !== null ? parseFloat(qty).toFixed(3) : null,
      width: 115,
    },
    {
      title: "QC Flag",
      dataIndex: "qc_flag",
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
      render: depleted => <Depletion depleted={depleted} />,
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
  indicesByID: state.indices.itemsByID,
  coordinatesByID: state.coordinates.itemsByID,
  sortBy: state.samples.sortBy,
});

const actionCreators = {listTable, setFilter, setFilterOption, clearFilters, setSortBy, clearSortBy};

const LibrariesListContent = ({
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
  indicesByID,
  coordinatesByID,
  sortBy,
  listTable,
  setFilter,
  setFilterOption,
  clearFilters,
  setSortBy,
  clearSortBy
}) => {

  const isPooledFilterKey = LIBRARY_FILTERS.is_pooled.key

  function getCurrentToggleOption(){
    switch(filters[isPooledFilterKey]?.value){
      case "true":
        return TOGGLE_OPTIONS.POOLS
        break;
      case "false":
        return TOGGLE_OPTIONS.LIBRARIES
        break;
      default:
        return TOGGLE_OPTIONS.ALL
    }
  }
  // Show both libraries and pools as default
  const [toggleOption, setToggleOption] = useState(getCurrentToggleOption());
  const [columns, setColumns] = useState(getTableColumns(containersByID, indicesByID, projectsByID, coordinatesByID, toggleOption));

  const listExport = () =>
    withToken(token, api.libraries.listExport)
    (mergedListQueryParams(LIBRARY_FILTERS, filters, sortBy))
      .then(response => response.data)

  const prefillTemplate = ({template}) =>
    withToken(token, api.libraries.prefill.request)
    (mergedListQueryParams(LIBRARY_FILTERS, filters, sortBy), template)
      .then(response => response)

  const nFilters = getNFilters(filters)

  // Listen to the changes in toggle to get new columns and set filters accordingly
  useEffect(() => {
    // Get the new columns depending on the new option
    setColumns(getTableColumns(containersByID, indicesByID, projectsByID, coordinatesByID, toggleOption))

    // Only apply filters if the new selected option is different from the current one
    if (getCurrentToggleOption() !== toggleOption){
      // Need to reset the sortBy when there's a new toggle option to avoid problems
      clearSortBy()

      if (toggleOption !== TOGGLE_OPTIONS.ALL)
        setFilter(isPooledFilterKey, toggleOption === TOGGLE_OPTIONS.POOLS ? "true" : "false")
      else
        setFilter(isPooledFilterKey, '')
    }
  }, [toggleOption, containersByID, indicesByID, projectsByID])

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
    LIBRARY_FILTERS,
    filters,
    setFilter,
    setFilterOption
  )))

  return <>
    <AppPageHeader title="Libraries" extra={[
      <ActionDropdown key='actions' urlBase={"/libraries"} actions={actions}/>,
      <PrefilledTemplatesDropdown key='prefills' prefillTemplate={prefillTemplate} totalCount={totalCount} prefills={prefills}/>,
      <ExportButton key='export' exportFunction={listExport} filename="libraries" itemsCount={totalCount}/>,
    ]}/>
    <PageContent>
      <div style={{display: 'flex', justifyContent: 'space-between'}}>
          <Radio.Group disabled={isFetching} value={toggleOption} onChange={handleToggleOptionChange} style={{marginTop:6}}>
            <Radio.Button value={TOGGLE_OPTIONS.LIBRARIES}> Libraries </Radio.Button>
            <Radio.Button value={TOGGLE_OPTIONS.POOLS}> Pools </Radio.Button>
            <Radio.Button value={TOGGLE_OPTIONS.ALL}> All </Radio.Button>
          </Radio.Group>
        <div className='filters-warning-bar'>
          <FiltersWarning
            nFilters={nFilters}
            filters={filters}
            description={LIBRARY_FILTERS}
          />
          <Button
            style={{ margin: 6 }}
            disabled={nFilters === 0}
            onClick={localClearFilters}
          >
            Clear Filters
          </Button>
        </div>
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
