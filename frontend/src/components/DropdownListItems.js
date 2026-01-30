import React, { useMemo } from "react";
import {Dropdown} from "antd";
import {CloseOutlined, LineOutlined, MenuOutlined} from "@ant-design/icons";

/**
 * 
 * @param {{ listItems: React.ReactNode[] }} param0
 * @returns 
 */
const DropdownListItems = ({listItems}) => {
  const menuListItems = useMemo(() => listItems.map((item, i) => ({
    key: i.toString(),
    label: item
  })), [listItems])

  return (
    listItems && listItems.length > 1 ? 
    <Dropdown menu={{ items: menuListItems }} placement="bottomRight">
      <div>
        <MenuOutlined /> {listItems && "Expand list..."}
      </div>
    </Dropdown>
    :
    <div>
      {listItems.length > 0 ? <LineOutlined /> : <CloseOutlined />} {listItems && listItems[0]}
    </div>
  )
}

export default DropdownListItems;