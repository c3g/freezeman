import React from "react";
import {connect} from "react-redux";
import {Link, useNavigate} from "react-router-dom";
import {Button} from "antd";
import {CheckOutlined} from "@ant-design/icons";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import ExportButton from "../ExportButton";

import FixedLengthText from "../FixedLengthText";
import DropdownListItems from "../DropdownListItems";

import api, {withToken}  from "../../utils/api"

import {listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/indices/actions";
import {actionDropdown} from "../../utils/templateActions";
import {INDEX_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import FiltersWarning from "../filters/FiltersWarning";
import mergedListQueryParams from "../../utils/mergedListQueryParams";
import { WithSequenceComponent } from "../shared/WithItemComponent";

const getTableColumns = (sequencesByID) => {
  return [
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
      title: "Index Set",
      dataIndex: "index_set__name",
      sorter: true,
      width: 80,
      render: (_, index) => <FixedLengthText text={index.index_set} fixedLength={40} />,
    },
    {
      title: "Index Name",
      dataIndex: "name",
      sorter: true,
      width: 80,
      render: (name, index) =>
        <Link to={`/indices/${index.id}`}>
          <FixedLengthText text={name} fixedLength={50} />
        </Link>,
    },
    {
      title: "Index Structure",
      dataIndex: "index_structure__name",
      sorter: true,
      width: 80,
      render: (_, index) => index.index_structure,
    },
    {
      title: "Sequence 3 prime (i7)",
      dataIndex: "sequences_3prime__value",
      width: 80,
      render: (_, index) => { return index && index.sequences_3prime &&
        <DropdownListItems listItems={index.sequences_3prime.map(sequence =>
          sequence && WithSequenceComponent(sequencesByID, sequence, sequence => sequence.value,))}
        />
      }
    },
    {
      title: "Sequence 5 prime (i5)",
      dataIndex: "sequences_5prime__value",
      width: 80,
      render: (_, index) => { return index && index.sequences_5prime &&
        <DropdownListItems listItems={index.sequences_5prime.map(sequence =>
          sequence && WithSequenceComponent(sequencesByID, sequence, sequence => sequence.value,))}
        />
      }
    },
  ].map((column) => ({ ...column, key: column.title }))
};

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  indicesByID: state.indices.itemsByID,
  indices: state.indices.items,
  sequencesByID: state.sequences.itemsByID,
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
  sequencesByID,
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

  const columns = getTableColumns(sequencesByID)
  .map(c => Object.assign(c, getFilterProps(
    c,
    INDEX_FILTERS,
    filters,
    setFilter,
    setFilterOption
  )))

  const nFilters = getNFilters(filters)

  const history = useNavigate();

  return <>
    <AppPageHeader title="Indices" extra={[
      <Button onClick={() => history("/indices/validate")}>
        <CheckOutlined /> Validate Indices
      </Button>,
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
