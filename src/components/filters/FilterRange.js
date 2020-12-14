import React from "react";
import {InputNumber} from "antd";
import "antd/es/input-number/style/css";


const FilterRange = ({
                        filterTypeName,
                        filterTypeMin,
                        filterTypeMax,
                        onChange,
                        filters
                      }) => {

  const handleChange = (name, val) => {
    onChange(name,val)
  }

  return <>
    <div>
      {`${filterTypeName.toUpperCase()}: `}
      <InputNumber
        min={1}
        max={1000}
        defaultValue={filters[filterTypeMin]}
        onChange={(val) => handleChange(filterTypeMin, val)}
      />
      { ' to ' }
      <InputNumber
        min={1}
        max={1000}
        defaultValue={filters[filterTypeMax]}
        onChange={(val) => handleChange(filterTypeMax, val)}
      />

    </div>
  </>;
};

export default FilterRange;