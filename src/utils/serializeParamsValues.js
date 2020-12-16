import {map} from 'rambda'

export const serializeParamsValues = map(x => [].concat(x).join(','))