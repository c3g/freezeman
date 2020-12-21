import React from "react";
import {Input} from "antd";
import "antd/es/input/style/css";
import "antd/es/input-number/style/css";
import FilterLabel from "./FilterLabel"
import * as style from "./style"


const FilterInput = ({
  item,
  value = null,
  placeholder,
  width = 200,
  onChange,
}) => {
  let handleChange;
  // Need to cache value in {target: {value}} due to SyntheticEvent not persisted
  handleChange= ({target: {value}}) => {
    onChange(item, value)
  }

  return (
    <div style={style.container}>
      <FilterLabel>{item.label}</FilterLabel>

      <Input.Group style={style.element} compact>
        <Input
          size='small'
          placeholder={placeholder}
          style={{ width: width}}
          value={value}
          onChange={handleChange}
        />
      </Input.Group>
    </div>
  );
};

export default FilterInput;