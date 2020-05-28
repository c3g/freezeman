import React from "react";

const defaultStyle = {
  flex: "1",
  padding: "16px 24px 24px 24px",
  overflow: "auto",
};

const PageContent = ({children, style}) =>
  <div
    style={style ? {...defaultStyle, ...style} : defaultStyle}
  >
    {children}
  </div>;

export default PageContent;
