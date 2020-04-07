import React from "react";

import {Button, PageHeader, Table} from "antd";
import "antd/es/button/style/css";
import "antd/es/page-header/style/css";
import "antd/es/table/style/css";

import {BarcodeOutlined, ExportOutlined, PlusOutlined} from "@ant-design/icons";

import TemplateFlow from "./TemplateFlow";

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

const ContainersPage = () => (
    <div style={{height: "100%", backgroundColor: "white", overflowY: "auto"}}>
        <PageHeader title="Containers"
                    ghost={false}
                    style={{borderBottom: "1px solid #f0f0f0", marginBottom: "8px"}}
                    extra={[
                        <Button key="add" icon={<PlusOutlined />}>Add Containers</Button>,
                        <Button key="move" icon={<ExportOutlined />}>Move Containers</Button>,
                    ]} />
        <div style={{padding: "16px 24px 8px 24px", overflowX: "auto"}}>
            <TemplateFlow nOfItems={100} itemPluralName="containers" />
            <Table size="small" style={{minWidth: "700px"}} bordered={true} columns={TABLE_COLUMNS} />
        </div>
    </div>
);

export default ContainersPage;
