import React from "react";
import {useHistory} from "react-router-dom";
import {Button} from "antd";
import {LinkOutlined} from "@ant-design/icons";

const LinkButton = ({url, ...rest}) => {
  const history = useHistory();
  return (
    <Button onClick={() => history.push(url)} {...rest}>
      <LinkOutlined /> Link Samples
    </Button>
  )
}

export default LinkButton;
