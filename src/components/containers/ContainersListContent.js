import React, {useEffect} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";

import {BarcodeOutlined} from "@ant-design/icons";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";

import {list, listTemplateActions} from "../../modules/containers/actions";
import {actionsToButtonList} from "../../utils/templateActions";

import Filters from "../Filters";

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
  containersKinds: state.containerKinds.items,
  actions: state.containerTemplateActions,
  page: state.containers.page,
  totalCount: state.containers.totalCount,
  isFetching: state.containers.isFetching,
});

const actionCreators = {list, listTemplateActions};

const ContainersListContent = ({
  containers,
  containersByID,
  containersKinds,
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

  const onChangeFilter = (val) => {
    console.log({kind: val})
    let test = 0
    filterList(test, test, {kind: val})
  }

  return <>
    <AppPageHeader title="Containers" extra={actionsToButtonList("/containers", actions)} />

    <Filters
      options={containersKinds.map(x => x.id)}
      multipleOptions={false}
      onChange={onChangeFilter}
    />
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
