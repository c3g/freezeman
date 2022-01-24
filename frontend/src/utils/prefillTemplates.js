import React from "react";
import {Link} from "react-router-dom";

import api, {withToken}  from "./api"
import mergedListQueryParams from "./mergedListQueryParams";
import {downloadFromText} from "../utils/download";
import {SAMPLE_FILTERS} from "../components/filters/descriptions";
import ExportButton from "../components/ExportButton"

import {Button, Menu, Dropdown, Modal} from "antd";
import {EditOutlined, ExperimentOutlined, ExportOutlined, PlusOutlined, LinkOutlined, CheckCircleOutlined, DownloadOutlined, ExclamationCircleOutlined} from "@ant-design/icons";

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

const prefillTemplate = ({token, filters, sortBy, template}) =>
  withToken(token, api.samples.prefill.request)
  (mergedListQueryParams(SAMPLE_FILTERS, filters, sortBy), template)
    .then(response => response.data)

export const prefillTemplatesToButtonDropdown = (token, totalCount, filters, sortBy, prefills) => {
  const prefillChoiceMenu = (
    <Menu>
      { prefills.items ? prefills.items.map((prefill, i) =>
          <Menu.Item key={i.toString()}>
            <ExportButton
              key='export'
              exportFunction={prefillTemplate}
              filename={prefill.description}
              description={prefill.description}
              itemsCount={totalCount}
              token={token}
              filters={filters}
              sortBy={sortBy}
              template={i}
            />
          </Menu.Item>) :
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
