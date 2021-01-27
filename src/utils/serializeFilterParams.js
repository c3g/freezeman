/*
 * serializeFilterParams.js
 */

import {FILTER_TYPE} from "../constants"

export default function serializeFilterParams(filters, descriptions) {
  const params = {}

  Object.keys(filters).forEach(field => {
    const value = filters[field]?.value
    const description = descriptions[field]
    let key = description.key

    if (value === undefined)
      return

    switch (description.type) {

      case FILTER_TYPE.RANGE: {
        if (value){
          params[key + '__gte'] = value.min
          params[key + '__lte'] = value.max
        }

        break
      }

      case FILTER_TYPE.SELECT: {
        key = (description.mode === "multiple") ? (key + "__in") : key

        if (value)
          params[key] = [].concat(value).join(',')

        break
      }

      case FILTER_TYPE.INPUT: {
        const options = filters[field].options
        key = (options && options.exactMatch) ? (key + "__startswith") : (key + "__icontains")

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
