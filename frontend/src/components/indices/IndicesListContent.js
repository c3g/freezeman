import React, {useRef} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import AddButton from "../AddButton";
import ExportButton from "../ExportButton";
import LinkButton from "../LinkButton";

import api, {withToken}  from "../../utils/api"

import {listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/indices/actions";
import {actionDropdown} from "../../utils/templateActions";
import {INDEX_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import FiltersWarning from "../filters/FiltersWarning";
import mergedListQueryParams from "../../utils/mergedListQueryParams";

const getTableColumns = () => [
    {
      title: "ID",
      dataIndex: "id",
      sorter: true,
      width: 80,
      render: (id, index) =>
        <Link to={`/indices/${index.id}`}>
          <div>{id}</div>
        </Link>,
    },
    {
      title: "Name",
      dataIndex: "name",
      sorter: true,
      width: 80,
      render: (name, index) =>
        <Link to={`/indices/${index.id}`}>
          <div>{name}</div>
        </Link>,
    },
    {
      title: "Index Structure",
      dataIndex: "structure",
      sorter: true,
      width: 80,
    },
    {
      title: "Index 3 Prime",
      dataIndex: "index3Prime",
      width: 80,
    },
    {
      title: "Index 5 Prime",
      dataIndex: "index5Prime",
      width: 80,
    },
  ];

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  indicesByID: state.indices.itemsByID,
  indices: state.indices.items,
  actions: state.indicesTemplateActions,
  page: state.indices.page,
  totalCount: state.indices.totalCount,
  isFetching: state.indices.isFetching,
  filters: state.indices.filters,
  sortBy: state.indices.sortBy,
});

const actionCreators = {listTable, setFilter, setFilterOption, clearFilters, setSortBy};

const IndicesListContent = ({
  token,
  indices,
  indicesByID,
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

  const listExport = () =>
    withToken(token, api.indices.listExport)
    (mergedListQueryParams(INDEX_FILTERS, filters, sortBy))
      .then(response => response.data)

  const columns = getTableColumns()
  .map(c => Object.assign(c, getFilterProps(
    c,
    INDEX_FILTERS,
    filters,
    setFilter,
    setFilterOption
  )))

  const nFilters = getNFilters(filters)

  console.log(actions)

  return <>
    <AppPageHeader title="Indices" extra={[
      actionDropdown("/indices", actions),
      <ExportButton key='export' exportFunction={listExport} filename="indices" itemsCount={totalCount}/>,
    ]}/>
    <PageContent>
      <div style={{ display: 'flex', textAlign: 'right', marginBottom: '1em' }}>
        <div style={{ flex: 1 }} />
        <FiltersWarning
          nFilters={nFilters}
          filters={filters}
          description={INDEX_FILTERS}
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
        items={indices}
        itemsByID={indicesByID}
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

export default connect(mapStateToProps, actionCreators)(IndicesListContent);
