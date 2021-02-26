/*
 * mergedListQueryParams.js
 */

import serializeFilterParams from "./serializeFilterParams";
import serializeSortByParams from "./serializeSortByParams";

export default function mergedListQueryParams(filterDescription, filters, sortBy){
  return {...serializeFilterParams(filters, filterDescription), ordering: serializeSortByParams(sortBy)}
}