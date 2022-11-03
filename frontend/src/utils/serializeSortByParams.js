/*
 * serializeSortByParams.js
 */

const prefixByOrder = {
  'ascend': '',
  'descend': '-',
}

export default function serializeSortByParams(sortBy) {
  if (sortBy.key === undefined || sortBy.order === undefined)
    return undefined
  const prefix = prefixByOrder[sortBy.order]
  return prefix + sortBy.key
}

/**
 * Given a column key (dataIndex), find a matching filter description and retrieve
 * the filter key to send to the backend.
 * 
 * Example:
 * 
 * Column:
 *      {
 *           title: "Library Type",
 *           dataIndex: "library_type",
 *           sorter: true
 *       },
 * 
 * Filter:
 *      library_type: {
 *         type: FILTER_TYPE.INPUT,
 *         key: "derived_sample__library__library_type__name",
 *         label: "Library Type"
 *       },
 * 
 * @param {*} sortBy 
 * @param {*} filterDescriptions 
 * @returns 
 */
export function serializeSortByParamsWithFilterKey(sortBy, filterDescriptions) {
  if (sortBy.key !== undefined && sortBy.order !== undefined) {
    const filter = filterDescriptions[sortBy.key]
    if (filter && filter.key) {
      const order = prefixByOrder[sortBy.order]
      return order + filter.key
    }
  }
  return undefined
}
