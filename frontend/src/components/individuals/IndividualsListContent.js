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
import WITH_ITEM from "../../utils/withItem";
import { WithItemComponent } from "../shared/WithItemComponent"


const TABLE_COLUMNS = (taxons) => {
  const withTaxon = WithItemComponent(WITH_ITEM.withTaxon)

  return [
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
  ].map((column) => ({ ...column, key: column.title }));
}

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  individualsByID: state.individuals.itemsByID,
  individuals: state.individuals.items,
  taxons: state.taxons,
  page: state.individuals.page,
  totalCount: state.individuals.totalCount,
  isFetching: state.individuals.isFetching,
  filters: state.individuals.filters,
  sortBy: state.individuals.sortBy,
});

const mapDispatchToProps = {listTable, setFilter, setFilterOption, clearFilters, setSortBy};

const IndividualsListContent = ({
  token,
  individuals,
  individualsByID,
  taxons,
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
  const listExport = () =>
    withToken(token, api.individuals.listExport)
    (mergedListQueryParams(INDIVIDUAL_FILTERS, filters, sortBy))
      .then(response => response.data)

  const columns = TABLE_COLUMNS(taxons).map(c => Object.assign(c, getFilterProps(
    c,
    INDIVIDUAL_FILTERS,
    filters,
    setFilter,
    setFilterOption
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
          onClick={clearFilters}
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
        onLoad={listTable}
        onChangeSort={setSortBy}
      />
    </PageContent>
  </>;
};

export default connect(mapStateToProps, mapDispatchToProps)(IndividualsListContent);
