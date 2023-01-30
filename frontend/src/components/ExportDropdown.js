import React from "react";
import {Link} from "react-router-dom";

import ExportButton from "../components/ExportButton";

import {Button, Menu, Dropdown, Modal} from "antd";
import {ExportOutlined, DownloadOutlined} from "@ant-design/icons";

const ExportDropdown = ({listExport, listExportMetadata, itemsCount}) => {    

    const exportMenu = (
    <Menu>
        <Menu.Item>
            <ExportButton style={{border:0}} key='export' exportType="samples" exportFunction={listExport} filename="sample_list" itemsCount={itemsCount}/>
        </Menu.Item>
        <Menu.Item>
            <ExportButton style={{border:0}} key='export-metadata' exportType="metadata" exportFunction={listExportMetadata} filename="sample_metadata" itemsCount={itemsCount}/>
        </Menu.Item>
    </Menu>
  ) ;

  return <Dropdown overlay={exportMenu} placement="bottomRight">
           <Button>
             <DownloadOutlined /> Export
           </Button>
         </Dropdown>
}

export default ExportDropdown;
