import React from "react";
import {FILTER_TYPE} from "../../constants";


const FiltersInfos = ({
  filters,
  description,
}) => {
  const appliedFilters = Object.keys(filters).filter(key => filters[key]?.value)

  const getValue = (key) => {
    const filterValue = filters[key].value
    const valuesArray = [].concat(filterValue)

    switch(description[key].type) {
      case FILTER_TYPE.SELECT:
        const labels = valuesArray.map((val) => {
          if(description[key].options) {
            const option = description[key].options.find(option => option.value === val)
            return option.label
          } else {
            return val
          }
        })
        return labels.join(', ')
      case FILTER_TYPE.RANGE:
      case FILTER_TYPE.DATE_RANGE:
        let value = ""
        if (filterValue.min !== undefined) {value += ` min: ${filterValue.min}`}
        if (filterValue.max !== undefined) {value +=` max: ${filterValue.max}`}
        if (value !== "")
          return value
        throw new Error('MIN and MAX values not defined for Filter range')
      case FILTER_TYPE.METADATA:
        return valuesArray.reduce((metadataString, metadata) => {
          return metadataString + metadata.name + ":" + metadata.value + ', '
        }, '')
      default:
        return valuesArray.join(', ')
    }
  }

  return (
    <>
      {appliedFilters.map((key, index) => (
        <div key={`${key}${index}`}>
          <strong>{description[key].label}: </strong>
          {getValue(key)}
        </div>
      ))}
    </>
  )
}

export default FiltersInfos;
