import React from "react";


const FilterSelect = ({
  filterType,
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
      {`${filterType.toUpperCase()}: `}
      <select
        id={`${filterType}Select`}
        multiple={multipleOptions}
        onChange={handleChange}
        value={filters[filterType]}
      >
        <option key={defaultValueName} value={defaultValue}>
          {defaultValueName}
        </option>
        {
          options.map((item, index) =>
            <option key={index} value={item}>
              {[item]}
            </option>
        )
        }
      </select>

    </div>
  </>;
};

export default FilterSelect;
