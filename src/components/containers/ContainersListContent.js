import React, {useEffect} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {BarcodeOutlined} from "@ant-design/icons";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import ExportButton from "../ExportButton";

import api, {withToken}  from "../../utils/api"
import {list, listTemplateActions} from "../../modules/containers/actions";
import {actionsToButtonList} from "../../utils/templateActions";


const TABLE_COLUMNS = [
  {
    title: <><BarcodeOutlined style={{marginRight: "8px"}} /> Barcode</>,
    dataIndex: "barcode",
    render: (barcode, container) => <Link to={`/containers/${container.id}`}>{barcode}</Link>,
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
  token: state.auth.tokens.access,
  containersByID: state.containers.itemsByID,
  containers: state.containers.items,
  actions: state.containerTemplateActions,
  page: state.containers.page,
  totalCount: state.containers.totalCount,
  isFetching: state.containers.isFetching,
});

const actionCreators = {list, listTemplateActions};

const ContainersListContent = ({
  token,
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

  const listExport = () =>
    withToken(token, api.containers.listExport)().then(response => response.data)

  return <>
    <AppPageHeader title="Containers" extra={[
      <ExportButton exportFunction={listExport} filename="containers"/>,
      ...actionsToButtonList("/containers", actions)
    ]}/>
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
