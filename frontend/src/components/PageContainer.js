import React from "react";

const style = {
  height: "100%",
  backgroundColor: "white",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden"
};

const PageContainer = ({children}) =>
  <div style={style}>
    {children}
  </div>;

export default PageContainer;
