import React from "react";
import {useHistory} from "react-router-dom";

import {Button} from "antd";
import "antd/es/button/style/css";

import {PlusOutlined} from "@ant-design/icons";

const AddButton = ({url}) => {
  const history = useHistory();
  return (
    <Button onClick={() => history.push(url)}>
      <PlusOutlined /> Add
    </Button>
  )
}

export default AddButton;
