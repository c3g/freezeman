import React from "react";


const FiltersDescription = ({
  filters
}) => {
  //TODO: display description label instead of the description key in <strong> {key}: </strong>
  return (
    <>
      {Object.keys(filters).map(key => (
        <div>
          <strong>{key}: </strong>
          {filters[key]?.value}
        </div>
      ))}
    </>
  )
}

export default FiltersDescription;