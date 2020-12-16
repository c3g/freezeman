import React from "react";
import {Select} from "antd";
import "antd/es/select/style/css";

const { Option } = Select;

const FilterSelect = ({
  type,
  name,
  value,
  options,
  mode,
  placeholder,
  onChange,
}) => {
  const handleChange = (val) => {
    onChange(type, val)
  }
  return <>
    <div>
      <label>{name.toUpperCase()}</label>
      <Select
        mode={mode}
        style={{ width: 200 }}
        placeholder={placeholder}
        onChange={handleChange}
        defaultValue={value}
      >
        {
          options.map((item, index) =>
            <Option key={index} value={item}> {item} </Option>
          )
        }
      </Select>
    </div>
  </>;
};

export default FilterSelect;
