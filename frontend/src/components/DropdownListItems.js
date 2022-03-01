import React from "react";
import {Button, Dropdown, Menu} from "antd";
import {CloseOutlined, LineOutlined, MenuOutlined} from "@ant-design/icons";

const DropdownListItems = ({ListItems}) => {
  const menuListItems = (
    <Menu>
      {ListItems ? ListItems.map((item, i) => <Menu.Item key={i.toString()}>{item}</Menu.Item>) : <Menu.Item/>}
    </Menu>
  );

  return (
    ListItems && ListItems.length > 1 ? 
    <Dropdown overlay={menuListItems} placement="bottomRight">
      <div>
        <MenuOutlined /> {ListItems && ListItems[0]}
      </div>
    </Dropdown>
    :
    <div>
      {ListItems ? <LineOutlined /> : <CloseOutlined />} {ListItems && ListItems[0]}
    </div>
  )
}

export default DropdownListItems;