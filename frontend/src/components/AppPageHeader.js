import React from "react";
import { PageHeader, PageHeaderProps } from '@ant-design/pro-layout';

const style = {
  backgroundColor: "rgba(0, 0, 0, 0.03)",
  borderBottom: "1px solid #ccc",
  flex: "0",
};

/**
 * 
 * @param {PageHeaderProps} props
 * @returns 
 */
const AppPageHeader = (props) =>
  <PageHeader
    ghost={false}
    style={style}
    {...props}
  />;

export default AppPageHeader;
