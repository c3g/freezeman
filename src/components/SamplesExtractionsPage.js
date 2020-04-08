import React from "react";

import {Button, PageHeader, Table} from "antd";
import "antd/es/button/style/css";
import "antd/es/page-header/style/css";
import "antd/es/table/style/css";

import {EditOutlined, ExperimentOutlined, ExportOutlined, PlusOutlined} from "@ant-design/icons";

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

const SamplesExtractionsPage = () => (
    <div style={{height: "100%", backgroundColor: "white", overflowY: "auto"}}>
        <PageHeader title="Samples & Extractions"
                    ghost={false}
                    style={{borderBottom: "1px solid #f0f0f0", marginBottom: "8px"}}
                    extra={[
                        <Button key="add" icon={<PlusOutlined />}>Add Samples</Button>,
                        <Button key="update" icon={<EditOutlined />}>Update Samples</Button>,
                        <Button key="process" icon={<ExperimentOutlined />}>Process Extractions</Button>,
                    ]} />
        <div style={{padding: "16px 24px 8px 24px", overflowX: "auto"}}>
            <Table bordered={true} columns={TABLE_COLUMNS} size="small" />
        </div>
    </div>
);
export default SamplesExtractionsPage;
