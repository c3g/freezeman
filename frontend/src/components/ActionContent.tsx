import React, {useCallback, useEffect} from "react";
import {useParams} from "react-router-dom";
import {Menu, Dropdown, Button} from "antd";
import {DownloadOutlined} from "@ant-design/icons";

import { isNullish } from "../utils/functions"
import api from "../utils/api";
import AppPageHeader from "./AppPageHeader";
import PageContent from "./PageContent";
import TemplateFlow from "./templateFlow/TemplateFlow";
import { useAppDispatch } from "../hooks";
import { FMSTemplateAction } from "../models/fms_api_models";

const LOADING_ACTION: FMSTemplateAction = {
  name: 'Loading...',
  description: 'Loading...',
  template: 'loading.xlsx',
}

const loadActions = {
  sample:    api.samples.template.actions,
  library:    api.libraries.template.actions,
  container: api.containers.template.actions,
  processMeasurement:   api.processMeasurements.template.actions,
  experimentRun: api.experimentRuns.template.actions,
  project: api.projects.template.actions,
  index: api.indices.template.actions,
  sampleNextStep: api.sampleNextStep.template.actions,
  pooledSample: api.pooledSamples.template.actions,
} as const

const checkRequests = {
  sample:    api.samples.template.check,
  library:    api.libraries.template.check,
  container: api.containers.template.check,
  processMeasurement:   api.processMeasurements.template.check,
  experimentRun: api.experimentRuns.template.check,
  project: api.projects.template.check,
  index: api.indices.template.check,
  sampleNextStep: api.sampleNextStep.template.check,
  pooledSample: api.pooledSamples.template.check,
} as const

const submitRequests = {
  sample:    api.samples.template.submit,
  library:    api.libraries.template.submit,
  container: api.containers.template.submit,
  processMeasurement:   api.processMeasurements.template.submit,
  experimentRun: api.experimentRuns.template.submit,
  project: api.projects.template.submit,
  index: api.indices.template.submit,
  sampleNextStep: api.sampleNextStep.template.submit,
  pooledSample: api.pooledSamples.template.submit,
} as const

export default function ActionContent({templateType}: { templateType: keyof typeof loadActions }) {
  const { action: actionId } = useParams()
  const actionIndex = parseInt(actionId, 10) || 0
  
  const dispatch = useAppDispatch()

  const [actions, setActions] = React.useState<FMSTemplateAction[]>([]);
  useEffect(() => {
    dispatch(loadActions[templateType]()).then((response) => {
      setActions(response.data)
    })
  }, [dispatch, templateType]);

  const checkRequest = useCallback((action: any, template: any) => {
    return dispatch(checkRequests[templateType](action, template))
  }, [dispatch, templateType])
  const submitRequest = useCallback((action: any, template: any) => {
    return dispatch(submitRequests[templateType](action, template))
  }, [dispatch, templateType])

  const action = actions[actionIndex] || LOADING_ACTION;

  const templateChoiceMenu = (
      <Menu>
        {actions[actionIndex]
          ? action.template.map((template, i) =>
            <Menu.Item key={i} onClick={() => window.location.assign(template.file)}>{template.description}</Menu.Item>) :
            <Menu.Item>Loading ...</Menu.Item>
        }
      </Menu>
    ) ;

  return <>
    <AppPageHeader
      title={action.name}
      extra={
        actions[actionIndex] && action.template.length > 1 ?
          <Dropdown overlay={templateChoiceMenu} placement="bottomRight">
            <Button>
              <DownloadOutlined /> Download Template...
            </Button>
          </Dropdown> :
          isNullish(action.template[0].file) ?
            <></> :
            <Button onClick={() => window.location.assign(action.template[0].file)}>
              <DownloadOutlined /> Download Template
            </Button>
      }
    />
    <PageContent>
      <TemplateFlow
        action={action}
        actionIndex={actionIndex}
        templateType={templateType}
        checkRequest={checkRequest}
        submitRequest={submitRequest}
      />
    </PageContent>
  </>;
}