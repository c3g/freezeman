import React from "react";
import {downloadFromText} from "../utils/download";

import {Button} from "antd";
import "antd/es/button/style/css";

import { DownloadOutlined } from "@ant-design/icons";


const ExportButton = ({ exportFunction, filename }) => {
  const name = filename + '_' + new Date().toISOString().slice(0, 10) + '.csv'
  const onClick = () => {
    exportFunction()
      .then(text => {
        downloadFromText(name, text)
      })
  }
  return (
    <Button onClick={onClick}>
      <DownloadOutlined />
      Export
    </Button>
  )
}

export default ExportButton;