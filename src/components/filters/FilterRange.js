import React from "react";


const FilterRange = ({
                        filterTypeName,
                        filterTypeMin,
                        filterTypeMax,
                        onChange,
                        filters
                      }) => {

  const handleChange = (e) => {
    onChange(e.target.id, e.target.value)
  }

  return <>
    <div>
      {`${filterTypeName.toUpperCase()}: `}
      <input type="text" id={filterTypeMin} value={filters[filterTypeMin]} onChange={handleChange} />
      { ' to ' }
      <input type="text" id={filterTypeMax} value={filters[filterTypeMax]} onChange={handleChange} />
    </div>
  </>;
};

export default FilterRange;