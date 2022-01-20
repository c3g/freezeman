import React from "react";
import {Link} from "react-router-dom";

import {Button, Menu, Dropdown} from "antd";
import {EditOutlined, ExperimentOutlined, ExportOutlined, PlusOutlined, LinkOutlined, CheckCircleOutlined, DownloadOutlined} from "@ant-design/icons";

export const templateIcon = t => {
  const n = t.description || t
  if (n.includes("add")) return <PlusOutlined />;
  if (n.includes("rename")) return <EditOutlined />;
  if (n.includes("move")) return <ExportOutlined />;
  if (n.includes("transfer")) return <ExportOutlined />;
  if (n.includes("update")) return <EditOutlined />;
  if (n.includes("process")) return <ExperimentOutlined />;
  if (n.includes("link")) return <LinkOutlined/>;
  if (n.includes("quality")) return <CheckCircleOutlined />;
  return undefined;
};

export const prefillTemplatesToButtonDropdown = (prefillRequest, prefills) => {
  console.log(prefills.items)
  const prefillChoiceMenu = (
    <Menu>
      { prefills.items ? prefills.items.map((prefill, i) =>
          <Menu.Item key={i.toString()} onClick={() => prefillRequest(i)}>{prefill.description}</Menu.Item>) :
          <Menu.Item>Loading ...</Menu.Item>
      }
    </Menu>
  ) ;

  return <Dropdown overlay={prefillChoiceMenu} placement="bottomRight">
           <Button>
             <DownloadOutlined /> Prefill Template...
           </Button>
         </Dropdown>
}

export const prefillTemplatesReducerFactory = moduleActions => (
  state = {
    items: [],
    isFetching: false,
    error: undefined,
  },
  action
) => {
  switch (action.type) {
    case moduleActions.LIST_PREFILL_TEMPLATES.REQUEST:
      return {...state, isFetching: true};
    case moduleActions.LIST_PREFILL_TEMPLATES.RECEIVE:
      console.log(action)
      return {
        ...state,
        isFetching: false,
        items: action.data,
      };
    case moduleActions.LIST_PREFILL_TEMPLATES.ERROR:
      return {
        ...state,
        isFetching: false,
        error: action.error,
      };
    default:
      return state;
  }
};
