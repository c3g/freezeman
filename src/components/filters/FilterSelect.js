import React from "react";
import {Select} from "antd";
import "antd/es/select/style/css";

const { Option } = Select;

const FilterSelect = ({
  item,
  value,
  options = item.options || [],
  onChange,
}) => {
  const handleChange = (value) => {
    onChange(item, value)
  }
  return (
    <div>
      <label>{item.label}</label>
      <Select
        mode={item.mode}
        style={{ width: 200 }}
        placeholder={item.placeholder}
        onChange={handleChange}
        defaultValue={value}
      >
        {
          options.map(item =>
            <Option key={item} value={item}>{item}</Option>
          )
        }
      </Select>
    </div>
  );
};

export default FilterSelect;
