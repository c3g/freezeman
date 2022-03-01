import React from "react";
import {Dropdown, Menu} from "antd";
import {CloseOutlined, LineOutlined, MenuOutlined} from "@ant-design/icons";

const DropdownListItems = ({listItems}) => {
  const menuListItems = (
    <Menu>
      {listItems ? listItems.map((item, i) => <Menu.Item key={i.toString()}>{item}</Menu.Item>) : <Menu.Item/>}
    </Menu>
  );

  return (
    listItems && listItems.length > 1 ? 
    <Dropdown overlay={menuListItems} placement="bottomRight">
      <div>
        <MenuOutlined /> {listItems && "Expand pool..."}
      </div>
    </Dropdown>
    :
    <div>
      {listItems.length > 0 ? <LineOutlined /> : <CloseOutlined />} {listItems && listItems[0]}
    </div>
  )
}

export default DropdownListItems;