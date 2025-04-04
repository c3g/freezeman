import React from "react";
import {Spin} from "antd";

const defaultStyle = {
  flex: "1",
  padding: "16px 24px 24px 24px",
  overflowY: "auto",
};

const PageContent = ({children, style = undefined, tabs = false, loading = false}) =>
  <div
    className={'PageContent' + (tabs ? ' --with-tabs' : '')}
    style={style ? {...defaultStyle, ...style} : defaultStyle}
  >
    <Spin spinning={loading}>
      {children}
    </Spin>
  </div>;

export default PageContent;
