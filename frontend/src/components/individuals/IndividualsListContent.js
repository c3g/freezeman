import { useDispatch, useSelector } from "react-redux"
import React from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button} from "antd";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import ExportButton from "../ExportButton";
import AddButton from "../AddButton";

import api, {withToken}  from "../../utils/api"
import {listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/individuals/actions";
import {INDIVIDUAL_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import FiltersWarning from "../filters/FiltersWarning";
import mergedListQueryParams from "../../utils/mergedListQueryParams";
import { withTaxon } from "../../utils/withItem";


const TABLE_COLUMNS = (taxons) => [
  {
    title: "ID",
    dataIndex: "id",
    sorter: true,
    render: (id, individual) => <Link to={`/individuals/${individual.id}`}>{id}</Link>,
  },
  {
    title: "Name",
    dataIndex: "name",
    sorter: true,
    render: (name, individual) =>
      <Link to={`/individuals/${individual.id}`}>
        <div>{name}</div>
        {individual.alias &&
          <div><small>alias: {individual.alias}</small></div>
        }
      </Link>,
  },
  {
    title: "Taxon",
    dataIndex: "taxon__name",
    sorter: true,
    options: Object.values(taxons.itemsByID).map(x => ({ label: x.name, value: x.name })), // for getFilterProps
    render: (_, individual) => <em>{(individual.taxon && withTaxon(taxons.itemsByID, individual.taxon, taxon => taxon.name, "Loading..."))}</em>,
  },
  {
    title: "Sex",
    dataIndex: "sex",
    sorter: true,
  },
  {
    title: "Pedigree",
    dataIndex: "pedigree",  // TODO: Link to modal with optional pedigree ID, mother, father
    sorter: true,
  },
  {
    title: "Cohort",
    dataIndex: "cohort",
    sorter: true,
  }

  // TODO: Detail action with optional pedigree ID, mother, father, all available samples, cohort size, etc.
];





const IndividualsListContent = ({  }) => {
  const token = useSelector((state) => state.auth.tokens.access)
  const individualsByID = useSelector((state) => state.individuals.itemsByID)
  const individuals = useSelector((state) => state.individuals.items)
  const taxons = useSelector((state) => state.taxons)
  const page = useSelector((state) => state.individuals.page)
  const totalCount = useSelector((state) => state.individuals.totalCount)
  const isFetching = useSelector((state) => state.individuals.isFetching)
  const filters = useSelector((state) => state.individuals.filters)
  const sortBy = useSelector((state) => state.individuals.sortBy)
  const dispatch = useDispatch()
  const dispatchListTable = useCallback((...args) => listTable(...args), [dispatch])
  const dispatchSetFilter = useCallback((...args) => setFilter(...args), [dispatch])
  const dispatchSetFilterOption = useCallback((...args) => setFilterOption(...args), [dispatch])
  const dispatchClearFilters = useCallback((...args) => clearFilters(...args), [dispatch])
  const dispatchSetSortBy = useCallback((...args) => setSortBy(...args), [dispatch])

  const listExport = () =>
    withToken(token, api.individuals.listExport)
    (mergedListQueryParams(INDIVIDUAL_FILTERS, filters, sortBy))
      .then(response => response.data)

  const columns = TABLE_COLUMNS(taxons).map(c => Object.assign(c, getFilterProps(
    c,
    INDIVIDUAL_FILTERS,
    filters,
    dispatchSetFilter,
    dispatchSetFilterOption
  )))

  const nFilters = getNFilters(filters)

  return <>
    <AppPageHeader title="Individuals" extra={[
        <AddButton key='add' url="/individuals/add" />,
        <ExportButton key='export' exportFunction={listExport} filename="individuals"  itemsCount={totalCount}/>,
    ]}/>
    <PageContent>
      <div style={{ display: 'flex', textAlign: 'right', marginBottom: '1em' }}>
        <div style={{ flex: 1 }} />
        <FiltersWarning
          nFilters={nFilters}
          filters={filters}
          description={INDIVIDUAL_FILTERS}
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
        items={individuals}
        itemsByID={individualsByID}
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
};

export default IndividualsListContent;
