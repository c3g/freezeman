import React, {useEffect} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";

import {BarcodeOutlined, EditOutlined, ExportOutlined, PlusOutlined} from "@ant-design/icons";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";

import {list, listTemplateActions} from "../../modules/containers/actions";
import {actionsToPageHeaderList} from "../../utils/templateActions";

const TABLE_COLUMNS = [
  {
    title: <><BarcodeOutlined style={{marginRight: "8px"}} /> Barcode</>,
    dataIndex: "id",
    render: id => <Link to={`/containers/${id}`}>{id}</Link>,
  },
  {
    title: "Name",
    dataIndex: "name",
  },
  {
    title: "Kind",
    dataIndex: "kind",
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
  },
];

const mapStateToProps = state => ({
  containersByID: state.containers.itemsByID,
  containers: state.containers.items,
  actions: state.containerTemplateActions,
  page: state.containers.page,
  totalCount: state.containers.totalCount,
  isFetching: state.containers.isFetching,
});

const actionCreators = {list, listTemplateActions};

const actionIcon = a => {
  if (a.name.includes("Add")) return <PlusOutlined />;
  if (a.name.includes("Rename")) return <EditOutlined />;
  if (a.name.includes("Move")) return <ExportOutlined />;
  return undefined;
}

const ContainersListContent = ({
  containers,
  containersByID,
  actions,
  isFetching,
  page,
  totalCount,
  list,
  listTemplateActions,
}) => {
  useEffect(() => {
    // Must be wrapped; effects cannot return promises
    listTemplateActions();
  }, []);
  return <>
    <AppPageHeader title="Containers" extra={actionsToPageHeaderList("/containers", actions, actionIcon)} />
    <PageContent>
      <PaginatedTable
        columns={TABLE_COLUMNS}
        items={containers}
        itemsByID={containersByID}
        loading={isFetching}
        totalCount={totalCount}
        page={page}
        onLoad={list}
      />
    </PageContent>
  </>;
}

export default connect(mapStateToProps, actionCreators)(ContainersListContent);
