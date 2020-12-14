import React from "react";
// import {Select} from "antd";
// import "antd/es/select/style/css";
//
// const { Option } = Select;

const FilterSelect = ({
  filterType,
  filterTypeName,
  options,
  multipleOptions,
  defaultValue,
  defaultValueName,
  onChange,
  filters
}) => {

  const handleChange = (e) => {
    const value = e.target.value
    onChange(filterType, value)
  }
  return <>
    <div>
      {`${filterTypeName.toUpperCase()}: `}
      <select
        id={`${filterType}Select`}
        multiple={multipleOptions}
        onChange={handleChange}
        defaultValue={filters[filterType]}
      >
        <option key={defaultValueName} value={defaultValue} label={defaultValue}>
          {defaultValueName}
        </option>
        {
          options.map((item, index) =>
            <option key={index} value={item} label={item}>
              {[item]}
            </option>
          )
        }
      </select>

    </div>
  </>;
};

export default FilterSelect;
