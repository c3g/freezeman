import React from "react";
import {useNavigate} from "react-router-dom";
import {Button} from "antd";
import {LinkOutlined} from "@ant-design/icons";

const LinkButton = ({url, ...rest}) => {
  const history = useNavigate();
  return (
    <Button onClick={() => history(url)} {...rest}>
      <LinkOutlined /> Link Samples
    </Button>
  )
}

export default LinkButton;
