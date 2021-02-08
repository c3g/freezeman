import React from "react";


const FiltersInfos = ({
  filters,
  description,
}) => {
  const appliedFilters = Object.keys(filters).filter(key => filters[key]?.value)

  const getValue = (key) => {
    const filterValue = filters[key].value

    switch(description[key].type) {
      case 'SELECT':
        const valuesArray = [].concat(filterValue)
        const labels = valuesArray.map((val) => {
          const option = description[key].options.find(option => option.value === val)
          return option.label
        })
        return labels.join(', ')
        break;
      case 'RANGE':
        if (filterValue.min || filterValue.max)
          return `${filterValue.min} to ${filterValue.max} `
        else
          throw new Error('MIN and MAX values not defined for Filter range')
        break;
      default:
        return [].concat(filterValue).join(', ')
    }
  }

  return (
    <>
      {appliedFilters.map(key => (
        <div>
          <strong>{description[key].label}: </strong>
          { getValue(key) }
        </div>
      ))}
    </>
  )
}

export default FiltersInfos;