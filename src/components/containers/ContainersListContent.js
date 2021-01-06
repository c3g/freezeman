import React, {useEffect} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {BarcodeOutlined} from "@ant-design/icons";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import AddButton from "../AddButton";
import ContainersFilters from "./ContainersFilters";
import ExportButton from "../ExportButton";


import {list, setSortBy} from "../../modules/containers/actions";
import api, {withToken}  from "../../utils/api"
import {actionsToButtonList} from "../../utils/templateActions";
import serializeFilterParams from "../../utils/serializeFilterParams";

import {CONTAINER_FILTERS} from "../filters/descriptions";


const TABLE_COLUMNS = [
  {
    title: "Barcode",
    dataIndex: "barcode",
    render: (barcode, container) => <Link to={`/containers/${container.id}`}>{barcode}</Link>,
    sorter: true,
  },
  {
    title: "Name",
    dataIndex: "name",
    sorter: true,
  },
  {
    title: "Kind",
    dataIndex: "kind",
    sorter: true,
  },
  {
    title: "Children",
    dataIndex: "children",
    align: 'right',
    render: children => children ? children.length : null,
  },
  {
    title: "Co-ords.",
    dataIndex: "coordinates",
    sorter: true,
  },
];

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  containersByID: state.containers.itemsByID,
  containers: state.containers.items,
  sortBy: state.containers.sortBy,
  filters: state.containers.filters,
  actions: state.containerTemplateActions,
  page: state.containers.page,
  totalCount: state.containers.totalCount,
  isFetching: state.containers.isFetching,
});

const actionCreators = {list, setSortBy};

const ContainersListContent = ({
  token,
  containers,
  containersByID,
  sortBy,
  filters,
  actions,
  isFetching,
  page,
  totalCount,
  list,
  setSortBy,
}) => {
  const listExport = () =>
    withToken(token, api.containers.listExport)
      (serializeFilterParams(filters, CONTAINER_FILTERS))
      .then(response => response.data)

  const onChangeSort = (key, order) => {
    setSortBy(key, order)
    list()
  }

  return <>
    <AppPageHeader title="Containers" extra={[
      <AddButton key='add' url="/containers/add" />,
      ...actionsToButtonList("/containers", actions),
      <ExportButton key='export' exportFunction={listExport} filename="containers"/>,
    ]}/>
    <PageContent>
      <ContainersFilters />
      <PaginatedTable
        // filters as a key in order to instantiate a new component on filters state change
        key={JSON.stringify(filters)}
        columns={TABLE_COLUMNS}
        items={containers}
        itemsByID={containersByID}
        loading={isFetching}
        totalCount={totalCount}
        page={page}
        sortBy={sortBy}
        onLoad={list}
        onChangeSort={onChangeSort}
      />
    </PageContent>
  </>;
}

export default connect(mapStateToProps, actionCreators)(ContainersListContent);
