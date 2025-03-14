import React from "react";

import PrefillTemplateButton from "../components/PrefillTemplateButton";

import {Button, Menu, Dropdown} from "antd";
import {EditOutlined, ExperimentOutlined, ExportOutlined, PlusOutlined, LinkOutlined, CheckCircleOutlined, DownloadOutlined, SelectOutlined, DotChartOutlined} from "@ant-design/icons";

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
  if (n.includes("convert")) return <EditOutlined />;
  if (n.includes("normalization")) return <DotChartOutlined />;
  if (n.includes("pool")) return <ExperimentOutlined />;
  return undefined;
};

export function PrefilledTemplatesDropdown({prefillTemplate, totalCount, prefills}) {
  return <Dropdown menu={{
    items: prefills && prefills.items && prefills.items.map(prefill => ({
      key: prefill.id.toString(),
      label: <PrefillTemplateButton
        style={{width:'100%', border:0, textAlign: 'left'}}
        key='export'
        exportFunction={prefillTemplate}
        filename={prefill.description}
        description={prefill.description}
        itemsCount={totalCount}
        template={prefill.id}
        icon={(templateIcon(prefill))}
      />,
      style: {style: {width: "100%", border: 0, textAlign: 'left'}}
    }))
  }} placement="bottomRight">
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
