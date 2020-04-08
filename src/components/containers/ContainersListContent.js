import React from "react";
import {Link} from "react-router-dom";

import {Button, Table} from "antd";
import "antd/es/button/style/css";
import "antd/es/table/style/css";
import {BarcodeOutlined, ExportOutlined, PlusOutlined} from "@ant-design/icons";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";

const TABLE_COLUMNS = [
    {
        title: <><BarcodeOutlined style={{marginRight: "0.7em"}} />Barcode</>,
        dataIndex: "barcode",
        render: barcode => <a href="#">{barcode}</a>,  // TODO
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
        title: "Location",
        dataIndex: "location",
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

const ContainersListContent = () => <>
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
        <Table size="small" style={{minWidth: "700px"}} bordered={true} columns={TABLE_COLUMNS} />
    </PageContent>
</>;

export default ContainersListContent;
