import React from "react";
import {Link} from "react-router-dom";

import {Button, Table} from "antd";
import "antd/es/button/style/css";
import "antd/es/table/style/css";
import {EditOutlined, ExperimentOutlined, PlusOutlined} from "@ant-design/icons";

import AppPageHeader from "../AppPageHeader";

const TABLE_COLUMNS = [
    {
        title: "Type",
        dataIndex: "biospecimen_type",
        width: 90
    },
    {
        title: "Name",
        dataIndex: "name"
    },
    {
        title: "Alias",
        dataIndex: "alias"
    },
    {
        title: "Individual",
        dataIndex: "individual"
    },
    {
        title: "Container",
        dataIndex: "container"  // TODO: Name AND barcode?
    },
    {
        title: "Location",
        dataIndex: "location"  // TODO: Name AND barcode? not explicit
    },
    {
        title: "Vol. (µL)",
        dataIndex: "volume",
        width: 100
    },
    {
        title: "Conc. (ng/µL)",
        dataIndex: "concentration",
        width: 115
    },
    {
        title: "Depleted",
        dataIndex: "depleted",
        width: 85
    }
];

const SamplesListContent = () => <>
    <AppPageHeader title="Samples & Extractions"
                   extra={[
                       <Link key="add" to="/samples/add">
                           <Button icon={<PlusOutlined />}>Add Samples</Button>
                       </Link>,
                       <Link key="update" to="/samples/update">
                           <Button icon={<EditOutlined />}>Update Samples</Button>
                       </Link>,
                       <Link key="process" to="/samples/extract">
                           <Button icon={<ExperimentOutlined />}>Process Extractions</Button>
                       </Link>,
                   ]} />
    <div style={{padding: "16px 24px 8px 24px", overflowX: "auto"}}>
        <Table bordered={true} columns={TABLE_COLUMNS} size="small" />
    </div>
</>;

export default SamplesListContent;
