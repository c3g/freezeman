import React from "react";
import {useNavigate} from "react-router-dom";
import {Button} from "antd";
import {PlusOutlined} from "@ant-design/icons";

const AddButton = ({url, ...rest}) => {
  const history = useNavigate();
  return (
    <Button onClick={() => history(url)} {...rest}>
      <PlusOutlined /> Add
    </Button>
  )
}

export default AddButton;
