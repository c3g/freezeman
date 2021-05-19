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

      case FILTER_TYPE.DATE_RANGE:
      case FILTER_TYPE.RANGE: {
        if (value) {
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

        if (value.includes(',')) {
          key += "__in"
        } else if (options?.exactMatch) {
          key += "__startswith"
        } else {
          key += "__icontains"
        }

        if(value)
          params[key] = value


        break;
      }

      case FILTER_TYPE.INPUT_NUMBER: {
        if(value) {
          params[key] = value
        }
        break;
      }

      default: {
        throw new Error('Invalid filter type')
      }
    }
  })

  return params
}
