import React from "react";
import {Typography} from "antd";
import {format} from "date-fns";
const {Text} = Typography;
import * as humanReadableTime from "./humanReadableTime";

/**
 * @param {Date} date
 * @param {string} style - 'compact' of 'full'
 */
export default function dateToString(date, style = "compact") {
  if (date === undefined)
    return <Text type="secondary">empty</Text>

  const d = new Date(date)
  if (Number.isNaN(+d))
    return <Text type="secondary">invalid date ({date})</Text>

  return (
    <abbr title={date} className="--time">
      {
        style === "compact" ?
          humanReadableTime.compact(d) :
          humanReadableTime.full(d)
      }
    </abbr>
  );
}

