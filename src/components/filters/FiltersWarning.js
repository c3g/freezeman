import React from "react";
import {Typography} from "antd";
import "antd/es/typography/style/css";
const {Text} = Typography

export default function FiltersWarning({ value }) {
  if (value === 0)
    return null
  return (
    <Text type="warning" style={{ marginLeft: 8, marginRight: 8, marginTop: 11 }}>
      {value} filter{value > 1 ? 's' : ''} applied
    </Text>
  )
}
