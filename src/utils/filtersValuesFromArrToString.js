
export default function filtersValuesFromArrToString(originalFilters) {
  let filters = {}
  for (const [key, value] of Object.entries(originalFilters)) {
    filters[key] = [].concat(value).join(",")
  }
  return filters;
}