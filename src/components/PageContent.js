import React from "react";

import {Spin} from "antd";
import "antd/es/spin/style/css";

const defaultStyle = {
  flex: "1",
  padding: "16px 24px 24px 24px",
  overflow: "auto",
};

const PageContent = ({children, style, loading}) =>
  <div
    style={style ? {...defaultStyle, ...style} : defaultStyle}
  >
    {loading ?
      <Spin>
        {children}
      </Spin>
      :
      children
    }
  </div>;

export default PageContent;
