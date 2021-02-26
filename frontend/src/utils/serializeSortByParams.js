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
