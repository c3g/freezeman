import React from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";

import {Button, Table} from "antd";
import "antd/es/button/style/css";
import "antd/es/table/style/css";
import {BarcodeOutlined, ExportOutlined, PlusOutlined} from "@ant-design/icons";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";

const TABLE_COLUMNS = [
    {
        title: <><BarcodeOutlined style={{marginRight: "8px"}} />Barcode</>,
        dataIndex: "barcode",
        render: barcode => <a href="#">{barcode}</a>,
        // TODO: Link to some interesting display with location hierarchy, children if relevant (or sample[s])
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
        title: <><BarcodeOutlined style={{marginRight: "8px"}} />Location</>,
        dataIndex: "location",
        render: barcode => <a href="#">{barcode}</a>,  // TODO: Same display, highlighting current as child?
    },
    {
        title: "Co-ords.",
        dataIndex: "coordinates",
    },
    {
        title: "Actions",
        key: "actions",
        render: () => (<span />),
    },
];

const ContainersListContent = ({containers, isFetching}) => <>
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
        <Table size="small"
               style={{minWidth: "700px"}}
               bordered={true}
               columns={TABLE_COLUMNS}
               dataSource={containers}
               rowKey="barcode"
               loading={isFetching} />
    </PageContent>
</>;

const mapStateToProps = state => ({
    containers: state.containers.items,
    isFetching: state.containers.isFetching,
});

export default connect(mapStateToProps)(ContainersListContent);
