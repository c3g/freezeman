import React from "react";
import {Link, useHistory} from "react-router-dom";

import {Button, Menu, Dropdown} from "antd";
import {EditOutlined, ExperimentOutlined, ExportOutlined, PlusOutlined, LinkOutlined, CheckCircleOutlined, DownloadOutlined, SelectOutlined, MonitorOutlined} from "@ant-design/icons";

export const actionIcon = a => {
  const n = a.name || a
  if (n.includes("Add")) return <PlusOutlined />;
  if (n.includes("Rename")) return <EditOutlined />;
  if (n.includes("Move")) return <ExportOutlined />;
  if (n.includes("Transfer")) return <ExportOutlined />;
  if (n.includes("Update")) return <EditOutlined />;
  if (n.includes("Process")) return <ExperimentOutlined />;
  if (n.includes("Link")) return <LinkOutlined/>;
  if (n.includes("Quality")) return <CheckCircleOutlined />;
  if (n.includes("qPCR")) return <SelectOutlined />;
  return <DownloadOutlined />;
};

export const actionsToButtonList = (urlBase, actions, fullWidth=false) =>
  (actions.items || []).map((a, i) =>
    <Link key={i.toString()} to={`${urlBase}/actions/${i}/`}>
      <Button icon={actionIcon(a)} {...(fullWidth ? {style: {width:"100%"}} : {})}>{a.name}</Button>
    </Link>
  );

export const actionDropdown = (urlBase, actions, fullWidth=false) => {
  const history = useHistory();
  const actionMenu = (
    <Menu>
      { actions.items ? actions.items.map((a, i) =>
          <Menu.Item key={i.toString()}>
            <Button
              icon={actionIcon(a)}
              onClick={() => history.push(`${urlBase}/actions/${i}/`)}
              {...(fullWidth ? {style:{width:"100%", border:0}} : {style:{border:0}})}
            >
              {a.name}
            </Button>
          </Menu.Item>) :
          <Menu.Item>Loading ...</Menu.Item>
      }
    </Menu>
  );

  return (<Dropdown overlay={actionMenu} placement="bottomRight">
            <Button>
              <MonitorOutlined />  Available Actions
            </Button>
          </Dropdown>)
};

export const templateActionsReducerFactory = moduleActions => (
  state = {
    items: [],
    isFetching: false,
    error: undefined,
  },
  action
) => {
  switch (action.type) {
    case moduleActions.LIST_TEMPLATE_ACTIONS.REQUEST:
      return {...state, isFetching: true};
    case moduleActions.LIST_TEMPLATE_ACTIONS.RECEIVE:
      return {
        ...state,
        isFetching: false,
        items: action.data,
      };
    case moduleActions.LIST_TEMPLATE_ACTIONS.ERROR:
      return {
        ...state,
        isFetching: false,
        error: action.error,
      };
    default:
      return state;
  }
};
