import {filter} from 'rambda'

export const filterObjectWithKeys = (object, keys) => filter(([_, key]) => keys.includes(key), object)