import React from "react";

import {Popover, Button} from "antd";
import {CheckOutlined, CloseOutlined} from "@ant-design/icons";

const getFlagContent = (flags) => {
  return  (
    <div>
      <p> Quantity Flag: {flags.quantity ? "Passed" : "Failed"}</p>
      <p> Quality Flag: {flags.quality ? "Passed" : "Failed"}</p>
    </div>
  )
}

export const SampleQCFlag = ({flags}) => {
  return (
    <Popover content={getFlagContent(flags)} title="QC Flags">
      {(flags.quantity && flags.quality)
        ? <Button style={{color: "#a0d911"}}><CheckOutlined style={{marginRight: "8px"}} />Passed</Button>
        : <Button style={{color: "#f5222d"}}><CloseOutlined style={{marginRight: "8px"}} />Failed</Button>}
    </Popover>
  )
}
