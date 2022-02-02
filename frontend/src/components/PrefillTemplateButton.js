import React, {useState} from "react";
import {downloadFromFile} from "../utils/download";
import {Button, Modal, notification} from "antd";

import { DownloadOutlined, ExclamationCircleOutlined } from "@ant-design/icons";

const { confirm } = Modal;

const PrefillTemplateButton = ({ exportFunction, filename, itemsCount, ...rest }) => {
  const [loading, setLoading] = useState(false);

  const onClick = () => {
    setLoading(true);

    confirm({
        title: 'Do you want to download this prefilled list?',
        icon: <ExclamationCircleOutlined />,
        content:
            <div>
                <p><b>{itemsCount} items</b> will be prefilled in the template</p>
                You can select a subset of items to be prefilled by filtering the list below.
            </div>,
        onOk() {
            exportFunction(rest)
            .then(response => {
              downloadFromFile(response.filename, response.data)
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
        { rest.description ?  rest.description : 'Prefill Template' }
    </Button>
  )
}

export default PrefillTemplateButton;
