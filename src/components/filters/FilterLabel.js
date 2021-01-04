import React from "react";

const style = {
  position: "relative",
  top: "-0.3em",
  fontWeight: "bold",
  fontSize: "0.8em",
  color: "#666",
}

const FilterLabel = ({ children, ...rest }) => {
  return (
    <label style={style} {...rest}>
      {children}
    </label>
  );
};

export default FilterLabel;
