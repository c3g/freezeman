import {format} from "date-fns";

export default function dateToString(date) {
  try {
    return format(new Date(date), "yyyy-MMM-dd HH:mm:ss")
  } catch(_) {}
  return `Invalid date: "${date}"`
}

