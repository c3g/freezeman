import React, {useEffect} from "react";
import {connect} from "react-redux";
import {useNavigate, useMatch, useParams} from "react-router-dom";
import PropTypes from "prop-types";
import {Menu, Dropdown, Button} from "antd";
import {DownloadOutlined} from "@ant-design/icons";

import { isNullish } from "../utils/functions"
import {fetchSummariesData} from "../modules/shared/actions";
import api, {withToken} from "../utils/api";
import AppPageHeader from "./AppPageHeader";
import PageContent from "./PageContent";
import TemplateFlow from "./templateFlow/TemplateFlow";

const LOADING_ACTION = {
  name: 'Loading...',
  description: 'Loading...',
  template: 'loading.xlsx',
}

const checkRequests = {
  sample:    api.samples.template.check,
  library:    api.libraries.template.check,
  container: api.containers.template.check,
  processMeasurement:   api.processMeasurements.template.check,
  experimentRun: api.experimentRuns.template.check,
  project: api.projects.template.check,
  index: api.indices.template.check,
  sampleNextStep: api.sampleNextStep.template.check,
}

const submitRequests = {
  sample:    api.samples.template.submit,
  library:    api.libraries.template.submit,
  container: api.containers.template.submit,
  processMeasurement:   api.processMeasurements.template.submit,
  experimentRun: api.experimentRuns.template.submit,
  project: api.projects.template.submit,
  index: api.indices.template.submit,
  sampleNextStep: api.sampleNextStep.template.submit
}

const ActionContent = ({token, templateType, templateActions}) => {
  const { action: actionId } = useParams()

  const actionIndex = parseInt(actionId, 10) || 0;
  const actions = templateActions[templateType];
  const checkRequest = withToken(token, checkRequests[templateType]);
  const submitRequest = withToken(token, submitRequests[templateType]);

  const action = actions.items[actionIndex] || LOADING_ACTION;

  const templateChoiceMenu = (
      <Menu>
        {actions.items[actionIndex]
          ? action.template.map((template, i) =>
            <Menu.Item key={i} onClick={() => window.location = template.file}>{template.description}</Menu.Item>) :
            <Menu.Item>Loading ...</Menu.Item>
        }
      </Menu>
    ) ;

  return <>
    <AppPageHeader
      title={action.name}
      extra={
        actions.items[actionIndex] && action.template.length > 1 ?
          <Dropdown overlay={templateChoiceMenu} placement="bottomRight">
            <Button>
              <DownloadOutlined /> Download Template...
            </Button>
          </Dropdown> :
          isNullish(action.template[0].file) ?
            <></> :
            <Button onClick={() => window.location = action.template[0].file}>
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
};

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  templateActions: {
    container: state.containerTemplateActions,
    sample: state.sampleTemplateActions,
    library: state.libraryTemplateActions,
    processMeasurement: state.processMeasurementTemplateActions,
    experimentRun: state.experimentRunTemplateActions,
    project: state.projectTemplateActions,
    index: state.indicesTemplateActions,
    sampleNextStep: state.sampleNextStepTemplateActions,
  },
});

const mapDispatchToProps = dispatch => ({
  fetchSummariesData: () => dispatch(fetchSummariesData),
})

ActionContent.propTypes = {
  templateType: PropTypes.oneOf(["container", "sample", "processMeasurement", "experimentRun", "project", "index", "library", "sampleNextStep"]).isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(ActionContent);
