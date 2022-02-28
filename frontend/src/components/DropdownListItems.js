import React from "react";
import {Dropdown, Menu} from "antd";
import {MoreOutlined} from "@ant-design/icons";

/* */
const DropdownListItems = ({ListItems}) => {
  const menuListItems = (
    <Menu>
      {ListItems ? ListItems.map((item, i) => <Menu.Item key={i.toString()}>{item}</Menu.Item>) : <Menu.Item/>}
    </Menu>
  );

  return (
    <Dropdown overlay={menuListItems}>
      <div>
        {ListItems && ListItems[0]}{ListItems && ListItems.length > 1 && <MoreOutlined />}
      </div>
    </Dropdown>
  )
}

export default DropdownListItems;