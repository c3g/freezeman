/*
 * serializeFilterParams.js
 */

import {FILTER_TYPE} from "../constants"

export default function serializeFilterParams(filters, descriptions) {
  const params = {}

  Object.keys(filters).forEach(field => {
    const value = filters[field].value
    const option = filters[field].option
    const description = descriptions[field]
    let key = description.key

    if (value === undefined)
      return

    if (option && option.exactMatch)
      key = key.replace("__icontains", "")

    switch (description.type) {

      case FILTER_TYPE.RANGE: {
        if (value[0] !== null)
          params[key + '__gte'] = value[0]

        if (value[1] !== null)
          params[key + '__lte'] = value[1]

        break
      }

      case FILTER_TYPE.SELECT: {
        if (value)
          params[key] = [].concat(value).join(',')

        break
      }

      case FILTER_TYPE.INPUT: {
        if(value)
          params[key] = value

        break;
      }

      default: {
        throw new Error('Invalid filter type')
      }
    }
  })

  return params
}
