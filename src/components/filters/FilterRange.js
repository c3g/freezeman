import React from "react";
import {InputNumber} from "antd";
import "antd/es/input-number/style/css";


const FilterRange = ({
  name,
  min,
  max,
  onChange,
  filter
}) => {

  const handleChange = (name, val) => {
    onChange(name, val)
  }

  return <>
    <div>
      <label>{name.toUpperCase()}</label>
      <InputNumber
        min={0}
        defaultValue={filter[min]}
        onChange={(val) => handleChange(min, val)}
      />
      { ' to ' }
      <InputNumber
        min={0}
        defaultValue={filter[max]}
        onChange={(val) => handleChange(max, val)}
      />

    </div>
  </>;
};

export default FilterRange;