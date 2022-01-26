import React, {useState} from "react";
import {downloadFromFile} from "../utils/download";
import {Button, Modal, notification} from "antd";

import { DownloadOutlined, ExclamationCircleOutlined } from "@ant-design/icons";

const { confirm } = Modal;

const ExportButton = ({ exportFunction, filename, itemsCount, ...rest }) => {
  const [loading, setLoading] = useState(false);

  const name = filename + '_' + new Date().toISOString().slice(0, 10) + '.csv'

  const onClick = () => {
    setLoading(true);

    confirm({
        title: 'Do you want to download this list?',
        icon: <ExclamationCircleOutlined />,
        content:
            <div>
                <p><b>{itemsCount} items</b> will be exported</p>
                You can select a subset of items to export by filtering the list below.
            </div>,
        onOk() {
            exportFunction(rest)
            .then(fileData => {
              downloadFromFile(name, fileData)
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
        },
        onCancel() {
          setLoading(false);
        },
      });

  }
  return (
    <Button icon={rest.icon || <DownloadOutlined />} onClick={onClick} loading={loading} {...rest}>
        { rest.description ?  rest.description : 'Export'}
    </Button>
  )
}

export default ExportButton;
