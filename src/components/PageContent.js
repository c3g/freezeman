import React from "react";
import {Spin} from "antd";

const defaultStyle = {
  flex: "1",
  padding: "16px 24px 24px 24px",
  overflow: "auto",
};

const PageContent = ({children, style, loading = false}) =>
  <div
    style={style ? {...defaultStyle, ...style} : defaultStyle}
  >
    <Spin spinning={loading}>
      {children}
    </Spin>
  </div>;

export default PageContent;
