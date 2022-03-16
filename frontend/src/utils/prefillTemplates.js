import React from "react";
import {Link} from "react-router-dom";

import PrefillTemplateButton from "../components/PrefillTemplateButton";

import {Button, Menu, Dropdown, Modal} from "antd";
import {EditOutlined, ExperimentOutlined, ExportOutlined, PlusOutlined, LinkOutlined, CheckCircleOutlined, DownloadOutlined, SelectOutlined} from "@ant-design/icons";

export const templateIcon = t => {
  const n = t.description || t
  if (n.includes("add")) return <PlusOutlined />;
  if (n.includes("rename")) return <EditOutlined />;
  if (n.includes("move")) return <ExportOutlined />;
  if (n.includes("transfer")) return <ExportOutlined />;
  if (n.includes("update")) return <EditOutlined />;
  if (n.includes("extract")) return <ExperimentOutlined />;
  if (n.includes("link")) return <LinkOutlined/>;
  if (n.includes("quality")) return <CheckCircleOutlined />;
  if (n.includes("qPCR")) return <SelectOutlined />;
  if (n.includes("prepare")) return <ExperimentOutlined />;
  return undefined;
};

export const prefillTemplatesToButtonDropdown = (prefillTemplate, totalCount, prefills) => {
  const prefillChoiceMenu = (
    <Menu>
      { prefills && prefills.items && prefills.items.map((prefill, i) =>
          <Menu.Item key={i.toString()}>
            <PrefillTemplateButton
              style={{border:0}}
              key='export'
              exportFunction={prefillTemplate}
              filename={prefill.description}
              description={prefill.description}
              itemsCount={totalCount}
              template={i}
              icon={(templateIcon(prefill))}
            />
          </Menu.Item>)
      }
    </Menu>
  ) ;

  return <Dropdown overlay={prefillChoiceMenu} placement="bottomRight">
           <Button>
             <DownloadOutlined /> Prefill Template
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
