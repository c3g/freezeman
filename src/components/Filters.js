import React from "react";


const Filters = ({
  filterItems,
  filterType,
  options,
  multipleOptions,
  onChange,
  filters
}) => {

  const handleChange = (e) => {
    const value = e.target.value
    onChange(filterType, value)
  }

  return <>
    <div>
      <select
        id={`${filterItems}${filterType}Select`}
        multiple={multipleOptions}
        onChange={handleChange}
        value={filters[filterType]}
      >
        <option key="all" value="">All</option>
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

export default Filters;
