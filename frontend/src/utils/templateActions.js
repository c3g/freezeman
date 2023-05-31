import React from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button, Menu, Dropdown } from "antd";
import {
  EditOutlined, ExperimentOutlined, ExportOutlined, PlusOutlined, LinkOutlined,
  CheckCircleOutlined, DownloadOutlined, SelectOutlined, MonitorOutlined, DotChartOutlined, FormOutlined
} from "@ant-design/icons";

export const actionIcon = a => {
  const n = a.name || a
  if (n.includes("Add")) return <PlusOutlined />;
  if (n.includes("Rename")) return <EditOutlined />;
  if (n.includes("Move")) return <ExportOutlined />;
  if (n.includes("Transfer")) return <ExportOutlined />;
  if (n.includes("Update")) return <EditOutlined />;
  if (n.includes("Process")) return <ExperimentOutlined />;
  if (n.includes("Link")) return <LinkOutlined />;
  if (n.includes("Quality")) return <CheckCircleOutlined />;
  if (n.includes("qPCR")) return <SelectOutlined />;
  if (n.includes("Prepare")) return <ExperimentOutlined />;
  if (n.includes("Capture")) return <ExperimentOutlined />;
  if (n.includes("Convert")) return <EditOutlined />;
  if (n.includes("Normalize")) return <DotChartOutlined />;
  if (n.includes("Planning")) return <FormOutlined />;
  if (n.includes("Pool")) return <ExperimentOutlined />;
  return <DownloadOutlined />;
};

export const actionsToButtonList = (urlBase, actions, fullWidth = false) =>
  (actions.items || []).map((a) =>
    <Link key={a.id.toString()} to={`${urlBase}/actions/${a.id}/`}>
      <Button icon={actionIcon(a)} {...(fullWidth ? { style: { width: "100%" } } : {})}>{a.name}</Button>
    </Link>
  );

export function ActionDropdown({ urlBase, actions, fullWidth = true }) {
  const history = useNavigate();
  const renderActions = actions.items.length > 0;
  const actionMenu = renderActions ? (
    <Menu>
      {actions.items.map((a) =>
        <Menu.Item key={a.id.toString()}>
          <Button
            icon={actionIcon(a)}
            onClick={() => history(`${urlBase}/actions/${a.id}/`)}
            {...(fullWidth ? { style: { width: "100%", border: 0, textAlign: 'left' } } : { style: { border: 0 } })}
          >
            {a.name}
          </Button>
        </Menu.Item>)
      }
    </Menu>
  ) : null;

  return (
    renderActions ?
      <Dropdown overlay={actionMenu} placement="bottomRight">
        <Button>
          <MonitorOutlined />  Available Actions
        </Button>
      </Dropdown> : null)
}

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
      return { ...state, isFetching: true };
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
