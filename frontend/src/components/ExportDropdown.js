import React from "react";

import ExportButton from "../components/ExportButton";

import { Button, Dropdown } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

const ExportDropdown = ({ listExport, listExportMetadata, itemsCount }) => {

    return <Dropdown menu={{
        items: [
            {
                key: 'export',
                label: <ExportButton style={{ border: 0 }} exportType="samples" exportFunction={listExport} filename="sample_list" itemsCount={itemsCount} />,
            },
            {
                key: 'export-metadata',
                label: <ExportButton style={{ border: 0 }} exportType="metadata" exportFunction={listExportMetadata} filename="sample_metadata" itemsCount={itemsCount} />,
            }
        ]
    }} placement="bottomRight">
        <Button>
            <DownloadOutlined /> Export
        </Button>
    </Dropdown>
}

export default ExportDropdown;
