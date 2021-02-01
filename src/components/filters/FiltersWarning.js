import React from "react";
import {Tooltip, Typography} from "antd";
import "antd/es/typography/style/css";
const {Text} = Typography

import FiltersDescriptions from "./FiltersDescriptions";


export default function FiltersWarning({ nFilters, filters }) {
  if (nFilters === 0)
    return null
  return (
    <Tooltip title={<FiltersDescriptions filters={filters}/>}>
      <span style={{marginTop: 12}}>
        <Text type="warning"
          style={{
            textDecoration: 'underline',
            textDecorationStyle: 'dotted',
            marginLeft: 8,
            marginRight: 8,
          }}
        >
          {nFilters} filter{nFilters > 1 ? 's' : ''} applied
        </Text>
      </span>
    </Tooltip>
  )
}
