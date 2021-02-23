import React from "react";
import {PageHeader} from "antd";

const style = {
  backgroundColor: "rgba(0, 0, 0, 0.03)",
  borderBottom: "1px solid #ccc",
  flex: "0",
};

const AppPageHeader = ({...props}) =>
  <PageHeader
    ghost={false}
    style={style}
    {...props}
  />;

export default AppPageHeader;
