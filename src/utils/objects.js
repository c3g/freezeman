import {indexBy, prop} from "rambda";

export const objectsByProperty = (items, key="id") =>
  indexBy(prop(key), items)
