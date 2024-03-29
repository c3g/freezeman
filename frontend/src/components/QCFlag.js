import React from "react";

import { Popover, Button } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { isNullish } from '../utils/functions'

const getFlagContent = (flags) => {
  return  (
    <div>
      {Object.entries(flags).map(([name, value]) => {
        return <p key={`${name}/${value}`}> {name} : {value===true ? "passed" : (value===false ? "failed" : "unset")} </p>
      })}
    </div>
  )
}

export const QCFlag = ({flags}) => {
  return (
    <Popover content={getFlagContent(flags)} title="QC Flags">
      {(Object.values(flags).every(flag => flag===true || isNullish(flag) ))
        ? <Button style={{color: "#a0d911"}}><CheckOutlined/>Passed</Button>
        : <Button style={{color: "#f5222d"}}><CloseOutlined/>Failed</Button>}
    </Popover>
  )
}
