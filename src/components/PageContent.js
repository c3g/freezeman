import React from "react";

const PageContent = ({children, style}) =>
    <div style={{padding: "16px 24px 24px 24px", ...(style || {})}}>{children}</div>;

export default PageContent;
