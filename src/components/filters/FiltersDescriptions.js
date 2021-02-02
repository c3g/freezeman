import React from "react";


const FiltersDescription = ({
  filters
}) => {
  //TODO: display description label instead of the description key in <strong> {key}: </strong>

  const appliedFilters = Object.keys(filters).filter(key => filters[key]?.value)

  return (
    <>
      {appliedFilters.map(key => (
        <div>
          <strong>{key}: </strong>
          { [].concat(filters[key].value).join(', ') }
        </div>
      ))}
    </>
  )
}

export default FiltersDescription;