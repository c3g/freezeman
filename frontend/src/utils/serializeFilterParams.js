/*
 * serializeFilterParams.js
 */

import {FILTER_TYPE} from "../constants"

export default function serializeFilterParams(filters, descriptions) {
  const params = {}

  function hasWhiteSpace(s) {
    return /\s/g.test(s);
  }

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
        const isBatch = description.batch && hasWhiteSpace(value) //value.includes(',')

        if (isBatch) {
          key += "__in"
        }
        else if (options) {
          if (options.recursiveMatch)
              key += "__recursive"
          else if (options.exactMatch)
              key += "__startswith"
          else
              key += "__icontains"
        }
        else {
          key += "__icontains"
        }

        if(value && isBatch){
          const items = value.split(' ') //expected CHUM-2015201670A RIM-8143272302
          console.log(items)
          console.log(items.join())
          params[key] = value //joins elements as a string with ',' as delimiter i.e. CHUM-2015201670A, RIM-8143272302
        }
        else if(value) {
          params[key] = value
        }


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
