import React, {useState} from "react";
import {downloadFromFile} from "../utils/download";
import {Button, Modal} from "antd";

import { DownloadOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useAppDispatch } from "../hooks";
import { notify } from "../modules/notification/actions";
import { NotificationType } from "../modules/notification/models";

const { confirm } = Modal;

const ExportButton = ({ exportType, exportFunction, filename, itemsCount, ...rest }) => {
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch()

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
            exportFunction()
            .then(text => {
              downloadFromFile(name, text)
            })
            .catch(err => {
              dispatch(notify(err.message, {
                title: err.message,
                description: <pre>{err.stack}</pre>,
                type: NotificationType.ERROR,
              }))
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
    <Button icon={<DownloadOutlined />} onClick={onClick} loading={loading} {...rest}>
      Export {exportType}
    </Button>
  )
}

export default ExportButton;
