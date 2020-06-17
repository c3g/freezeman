import React from "react";
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import {Link} from "react-router-dom";

import {Button} from "antd";
import "antd/es/button/style/css";
import {BarcodeOutlined, ExportOutlined, PlusOutlined} from "@ant-design/icons";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import {list} from "../../modules/containers/actions";

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
    page: state.containers.page,
    totalCount: state.containers.totalCount,
    isFetching: state.containers.isFetching,
});

const mapDispatchToProps = dispatch =>
    bindActionCreators({ list }, dispatch);

const ContainersListContent = ({
    containers,
    containersByID,
    isFetching,
    page,
    totalCount,
    list,
}) => <>
    <AppPageHeader title="Containers"
                   extra={[
                       <Link key="add" to="/containers/add">
                           <Button icon={<PlusOutlined />}>Add Containers</Button>
                       </Link>,
                       <Link key="move" to="/containers/move">
                           <Button icon={<ExportOutlined />}>Move Containers</Button>
                       </Link>,
                   ]} />
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

export default connect(mapStateToProps, mapDispatchToProps)(ContainersListContent);
