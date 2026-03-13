import React, {useCallback, useEffect, useMemo} from "react";
import {useParams} from "react-router-dom";
import {Dropdown, Button, MenuProps, ButtonProps} from "antd";
import {DownloadOutlined} from "@ant-design/icons";

import { isNullish } from "../utils/functions"
import api from "../utils/api";
import AppPageHeader from "./AppPageHeader";
import PageContent from "./PageContent";
import TemplateFlow from "./templateFlow/TemplateFlow";
import { useAppDispatch } from "../hooks";
import { FMSTemplateAction } from "../models/fms_api_models";
import { downloadFromFile } from "../utils/download";

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

  const templateChoiceMenu: MenuProps = {
    items: actions[actionIndex]
      ? action.template.map((template, i) => ({
        key: i,
        onClick: () => window.location.assign(template.file),
        label: template.description
      }))
      : [{ key: 'loading', label: 'Loading...' }]
  }

    const extra = useMemo(() => {
        if (action.template.length === 0) {
            return <></>
        }

        if (actions[actionIndex] && action.template.length > 1) {
            return <Dropdown menu={templateChoiceMenu} placement="bottomRight">
                       <Button>
                           <DownloadOutlined /> Download Template...
                       </Button>
                   </Dropdown>
        }

        const file = action.template[0].file
        if (!isNullish(file)) {
            let onClick: ButtonProps['onClick'] = undefined
            if (file.endsWith("Sample_Rename_v5_6_0.xlsx")) {
                onClick = () => dispatch(api.pooledSamples.prefill.request({ id__in: 0 }, actionIndex)).then(response => {
                    downloadFromFile(response.filename, response.data)
                })
            } else {
                onClick = () => window.location.assign(file)
            }

            return <Button onClick={onClick}>
                       <DownloadOutlined /> Download Template
                   </Button>
        }

        return <></>
    }, [action.template, actions[actionIndex]])

  return <>
    <AppPageHeader
      title={action.name}
      extra={extra}
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
