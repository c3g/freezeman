import React from "react";


const FiltersInfos = ({
  filters,
  description,
}) => {
  const appliedFilters = Object.keys(filters).filter(key => filters[key]?.value)

  return (
    <>
      {appliedFilters.map(key => (
        <div>
          <strong>{description[key].label}: </strong>
          { [].concat(filters[key].value).join(', ') }
        </div>
      ))}
    </>
  )
}

export default FiltersInfos;