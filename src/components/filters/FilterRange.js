import React from "react";
import {InputNumber} from "antd";
import "antd/es/input-number/style/css";


const FilterRange = ({
  name,
  type,
  onChange,
  filter
}) => {

  const handleChange = (name, val) => {
    onChange(name,val)
  }

  const typeMin = (type) =>{
    return `${type}__gte`
  }

  const typeMax = (type) =>{
    return `${type}__lte`
  }

  return <>
    <div>
      <label>{name.toUpperCase()}</label>
      <InputNumber
        min={0}
        defaultValue={filter[typeMin]}
        onChange={(val) => handleChange(typeMin(type), val)}
      />
      { ' to ' }
      <InputNumber
        min={0}
        defaultValue={filter[typeMax]}
        onChange={(val) => handleChange(typeMax(type), val)}
      />

    </div>
  </>;
};

export default FilterRange;