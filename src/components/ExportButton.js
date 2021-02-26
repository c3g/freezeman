import React, {useState} from "react";
import {downloadFromText} from "../utils/download";
import {Button, notification} from "antd";

import { DownloadOutlined } from "@ant-design/icons";


const ExportButton = ({ exportFunction, filename, ...rest }) => {
  const [loading, setLoading] = useState(false);

  const name = filename + '_' + new Date().toISOString().slice(0, 10) + '.csv'
  const onClick = () => {
    setLoading(true);
    exportFunction()
      .then(text => {
        downloadFromText(name, text)
      })
      .catch(err => {
        notification.error({
          message: err.message,
          description: <pre>{err.stack}</pre>,
        });
      })
      .then(() => {
        setLoading(false);
      })
  }
  return (
    <Button onClick={onClick} loading={loading} {...rest}>
      <DownloadOutlined />
      Export
    </Button>
  )
}

export default ExportButton;
