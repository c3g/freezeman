import React from "react";
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import {Link} from "react-router-dom";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import ExportButton from "../ExportButton";
import AddButton from "../AddButton";
import {list, setSortBy} from "../../modules/individuals/actions";
import api, {withToken}  from "../../utils/api"


const TABLE_COLUMNS = [
  {
    title: "Name",
    dataIndex: "id",
    sorter: true,
    render: (id, individual) => <Link to={`/individuals/${id}`}>{individual.label || id}</Link>,
  },
  {
    title: "Taxon",
    dataIndex: "taxon",
    sorter: true,
    render: taxon => <em>{taxon}</em>,
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

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  individualsByID: state.individuals.itemsByID,
  individuals: state.individuals.items,
  page: state.individuals.page,
  totalCount: state.individuals.totalCount,
  isFetching: state.individuals.isFetching,
  sortBy: state.individuals.sortBy,
});

const mapDispatchToProps = {list, setSortBy};

const IndividualsListContent = ({
  token,
  individuals,
  individualsByID,
  isFetching,
  page,
  totalCount,
  sortBy,
  list,
  setSortBy,
}) => {
  const listExport = () =>
    withToken(token, api.individuals.listExport)().then(response => response.data)

  const onChangeSort = (key, order) => {
    setSortBy(key, order)
    list()
  }

  return <>
    <AppPageHeader title="Individuals" extra={[
        <AddButton key='add' url="/individuals/add" />,
        <ExportButton key='export' exportFunction={listExport} filename="individuals" />,
    ]}/>
    <PageContent>
        <PaginatedTable
          columns={TABLE_COLUMNS}
          items={individuals}
          itemsByID={individualsByID}
          rowKey="id"
          loading={isFetching}
          totalCount={totalCount}
          page={page}
          sortBy={sortBy}
          onLoad={list}
          onChangeSort={onChangeSort}
        />
    </PageContent>
  </>;
};

export default connect(mapStateToProps, mapDispatchToProps)(IndividualsListContent);
