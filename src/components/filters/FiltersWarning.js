import React from "react";
import {Tooltip, Typography} from "antd";
import "antd/es/typography/style/css";
const {Text} = Typography
import {QuestionCircleOutlined} from "@ant-design/icons";

import FiltersInfos from "./FiltersInfos";


export default function FiltersWarning({ nFilters, filters, description }) {
  if (nFilters === 0)
    return null
  return (
    <Tooltip title={<FiltersInfos filters={filters} description={description}/>}>
      <span style={{marginTop: 12}}>
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
