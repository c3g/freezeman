import {indexBy, prop} from "rambda";

export const indexByID = (items, key="id") =>
  indexBy(prop(key), items);
