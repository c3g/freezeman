import React from "react";
import {useHistory} from "react-router-dom";
import {Button} from "antd";
import {EditOutlined} from "@ant-design/icons";

const EditButton = ({url}) => {
  const history = useHistory();
  return (
    <Button onClick={() => history.push(url)}>
      <EditOutlined /> Edit
    </Button>
  )
}

export default EditButton;
