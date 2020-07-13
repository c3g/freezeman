import React from "react";
import {Link} from "react-router-dom";

import {Button} from "antd";
import "antd/es/button/style/css";

export const actionsToPageHeaderList = (urlBase, actions, actionIcon) =>
  (actions.items || []).map((a, i) =>
    <Link key={i.toString()} to={`${urlBase}/actions/${i}/`}>
      <Button icon={actionIcon(a)}>{a.name}</Button>
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
