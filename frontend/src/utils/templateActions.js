import React from "react";
import {Link} from "react-router-dom";

import {Button} from "antd";
import {EditOutlined, ExperimentOutlined, ExportOutlined, PlusOutlined} from "@ant-design/icons";

export const actionIcon = a => {
  const n = a.name || a
  if (n.includes("Add")) return <PlusOutlined />;
  if (n.includes("Rename")) return <EditOutlined />;
  if (n.includes("Move")) return <ExportOutlined />;
  if (n.includes("Update")) return <EditOutlined />;
  if (n.includes("Process")) return <ExperimentOutlined />;
  return undefined;
};

export const actionsToButtonList = (urlBase, actions, fullWidth=false) =>
  (actions.items || []).map((a, i) =>
    <Link key={i.toString()} to={`${urlBase}/actions/${i}/`}>
      <Button icon={actionIcon(a)} {...(fullWidth ? {style: {width: "100%"}} : {})}>{a.name}</Button>
    </Link>
  );

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
