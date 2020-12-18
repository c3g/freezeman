/*
 * serializeFilterParams.js
 */

import {FILTER_TYPE} from "../constants"

export default function serializeFilterParams(filters, descriptions) {
  const params = {}

  Object.keys(filters).forEach(key => {
    const value = filters[key]
    const description = descriptions[key]

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
          params[key] = value.join(',')

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
