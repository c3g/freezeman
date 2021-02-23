import React from "react";
import {useHistory} from "react-router-dom";
import {Button} from "antd";
import {PlusOutlined} from "@ant-design/icons";

const AddButton = ({url, ...rest}) => {
  const history = useHistory();
  return (
    <Button onClick={() => history.push(url)} {...rest}>
      <PlusOutlined /> Add
    </Button>
  )
}

export default AddButton;
