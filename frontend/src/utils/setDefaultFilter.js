export default function setDefaultFilter(filterName, filterValue, setFilter, filters, clearFilters){
  if (!filterValue)
    return

  if(filterName in filters) {
    if (filters[filterName]["value"] !== filterValue){
      clearFilters()
      setFilter(filterName, filterValue)
    }
  }
  else
    setFilter(filterName, filterValue)
}
