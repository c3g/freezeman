import React, {useEffect} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Typography} from "antd";
import {BarcodeOutlined} from "@ant-design/icons";
const {Text} = Typography;

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import AddButton from "../AddButton";
import ContainersFilters from "./ContainersFilters";
import ExportButton from "../ExportButton";


import {list, setSortBy} from "../../modules/containers/actions";
import api, {withToken}  from "../../utils/api"
import {actionsToButtonList} from "../../utils/templateActions";
import {withContainer, withSample} from "../../utils/withItem";
import serializeFilterParams from "../../utils/serializeFilterParams";

import {CONTAINER_FILTERS} from "../filters/descriptions";

const CONTAINER_KIND_SHOW_SAMPLE = ["tube"]

const getTableColumns = (samplesByID, containersByID) => [
    {
      title: "Name",
      dataIndex: "name",
      sorter: true,
    },
    {
      title: <><BarcodeOutlined style={{marginRight: "8px"}} /> Barcode</>,
      dataIndex: "barcode",
      sorter: true,
      render: (barcode, container) => <Link to={`/containers/${container.id}`}>{barcode}</Link>,
    },
    {
      title: "Sample",
      dataIndex: "samples",
      render: (samples, container) =>
        (CONTAINER_KIND_SHOW_SAMPLE.includes(container.kind) && samples.length > 0 && 
          <>
            {samples.map((id, i) =>
              <React.Fragment key={id}>
                <Link to={`/samples/${id}`}>
                  {withSample(samplesByID, id, sample => sample.name, <span>Loading…</span>)}
                </Link>
                {i !== samples.length - 1 ? ', ' : ''}
              </React.Fragment>
            )}
          </>
          ),
    },
    {
      title: "Kind",
      dataIndex: "kind",
      sorter: true,
    },
    {
      title: "Location Name",
      dataIndex: "location",
      sorter: true,
      render: location =>
        (location &&
          withContainer(containersByID, location, container => container.name, "Loading...")),
    },
    {
      title: <><BarcodeOutlined style={{marginRight: "8px"}} /> Location Barcode</>,
      dataIndex: "location",
      sorter: true,
      render: location => (location &&
        <Link to={`/containers/${location}`}>
          {withContainer(containersByID, location, container => container.barcode, "Loading...")}
        </Link>),
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
  samplesByID: state.samples.itemsByID,
});

const actionCreators = {list, setSortBy};

const ContainersListContent = ({
  token,
  containers,
  containersByID,
  samplesByID,
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

  const columns = getTableColumns(samplesByID, containersByID)
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
        columns={columns}
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
