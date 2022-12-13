/*
 * serializeFilterParams.js
 */

import {FILTER_TYPE} from "../constants"

export default function serializeFilterParams(filters, descriptions) {
  const params = {}

  function hasSpaces(string) {
      return string.indexOf(' ') >= 1;
  };

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
        const isBatch = description.batch && hasSpaces(value)

        if(isBatch){
          params[key] = value
          break
        }

        if (options) {
          if (options.recursiveMatch)
            key += "__recursive"
          else if (options.exactMatch)
            key += "__startswith"
          else
            key += "__icontains"
        } else {
            key += "__icontains"
        }

       if(value)
          params[key] = value

       break;
     }

      case FILTER_TYPE.INPUT_NUMBER:
      case FILTER_TYPE.INPUT_OBJECT_ID:   {
        if(value) {
          key += "__in"
          params[key] = value
        }
        break;
      }

      case FILTER_TYPE.METADATA:   {
        if(value) {
          //Serialize key-value metadata pairs in a string
          //with the form: name1__value1, name2__value2, name2__value3, etc
          params[key]  = value.reduce((serializedMetadata, metadata) => {
            return serializedMetadata + metadata.name + '__' + (metadata.value ? metadata.value : '')  + ','
          }, '')
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
