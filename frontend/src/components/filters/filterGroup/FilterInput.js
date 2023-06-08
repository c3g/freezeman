import React from "react";
import {Input} from "antd";
import FilterLabel from "./FilterLabel"
import * as style from "./style"
import DebouncedInput from "../FilterProps/DebouncedInput";


const FilterInput = ({
  item,
  value = null,
  placeholder,
  width = 200,
  onChange,
}) => {
  const onInputChange = (value) => {
    onChange(item, value)
  }

  return (
    <div style={style.container}>
      <FilterLabel>{item.label}</FilterLabel>

      <Input.Group style={style.element} compact>
        <DebouncedInput
          size='small'
          placeholder={placeholder}
          style={{ width: width}}
          value={value}
          onInputChange={onInputChange}
        />
      </Input.Group>
    </div>
  );
};

export default FilterInput;
