import {indexBy, prop} from "rambda";

export const indexByID = (items, key="id", old = {}) =>
  ({ ...old, ...indexBy(prop(key), items) })
