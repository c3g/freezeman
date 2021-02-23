import React from "react";
import {Typography} from "antd";
import {format} from "date-fns";
const {Text} = Typography;

export default function dateToString(date) {
  if (date === undefined)
    return <Text type="secondary">empty</Text>
  try {
    return format(new Date(date), "yyyy-MMM-dd HH:mm:ss");
  } catch(_) {}
  return `Invalid date: "${date}"`;
}

