import React from "react";
import {Tooltip, Typography} from "antd";
const {Text} = Typography
import {QuestionCircleOutlined} from "@ant-design/icons";

import FiltersInfos from "./FiltersInfos";


export default function FiltersWarning({ nFilters, filters, description }) {
  if (nFilters === 0)
    return null
  return (
    <Tooltip placement={'bottom'} title={<FiltersInfos filters={filters} description={description}/>}>
      <span style={{marginRight: '1rem'}}>
        <Text type="warning"
          style={{
            marginLeft: 8,
            marginRight: 8,
          }}
        >
          {nFilters} filter{nFilters > 1 ? 's' : ''} applied <QuestionCircleOutlined />
        </Text>
      </span>
    </Tooltip>
  )
}
