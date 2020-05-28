import {format} from "date-fns";

export default function dateToString(date) {
  return format(new Date(date), "yyyy-MMM-dd HH:mm:ss")
}

