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
  const onInputChange = (ev) => {
    onChange(item, ev.target.value)
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
          onChange={onInputChange}
        />
      </Input.Group>
    </div>
  );
};

export default FilterInput;
