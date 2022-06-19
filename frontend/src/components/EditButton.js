import React from "react";
import {useNavigate} from "react-router-dom";
import {Button} from "antd";
import {EditOutlined} from "@ant-design/icons";

const EditButton = ({url}) => {
  const history = useNavigate();
  return (
    <Button onClick={() => history.push(url)}>
      <EditOutlined /> Edit
    </Button>
  )
}

export default EditButton;
