import React from "react";
import {Select} from "antd";
import "antd/es/select/style/css";

const { Option } = Select;

const FilterSelect = ({
  filterType,
  filterTypeName,
  options,
  mode,
  placeholder,
  onChange,
  filters
}) => {
  const handleChange = (val) => {
    onChange(filterType, val)
  }
  return <>
    <div>
      {`${filterTypeName.toUpperCase()}: `}
      <Select
        id={`${filterType}Select`}
        mode={mode}
        style={{ width: 200 }}
        placeholder={placeholder}
        onChange={handleChange}
        defaultValue={filters[filterType]}
      >
        {
          options.map((item, index) =>
            <Option key={index} value={[item]}> {item} </Option>
          )
        }
      </Select>
    </div>
  </>;
};

export default FilterSelect;
