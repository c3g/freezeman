import React, {useEffect} from "react";
import {connect} from "react-redux";
import {useHistory, useRouteMatch} from "react-router-dom";
import PropTypes from "prop-types";
import {Button} from "antd";
import {DownloadOutlined} from "@ant-design/icons";

import {fetchAuthorizedData} from "../modules/shared/actions";
import api, {withToken} from "../utils/api";
import AppPageHeader from "./AppPageHeader";
import PageContent from "./PageContent";
import TemplateFlow from "./TemplateFlow";

const LOADING_ACTION = {
  name: 'Loading...',
  description: 'Loading...',
  template: 'loading.xlsx',
}

const checkRequests = {
  sample:    api.samples.template.check,
  container: api.containers.template.check,
}

const submitRequests = {
  sample:    api.samples.template.submit,
  container: api.containers.template.submit,
}

const ActionContent = ({token, templateType, templateActions}) => {
  const history = useHistory();
  const match = useRouteMatch();

  const actionIndex = parseInt(match.params.action, 10) || 0;
  const actions = templateActions[templateType];
  const checkRequest = withToken(token, checkRequests[templateType]);
  const submitRequest = withToken(token, submitRequests[templateType]);
  const goBack = () => {
    history.goBack()
  }

  const action =
    actions.items[actionIndex] || LOADING_ACTION;

  return <>
    <AppPageHeader
      title={action.name}
      onBack={goBack}
      extra={
        <Button onClick={() => window.location = action.template}>
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
        goBack={goBack}
      />
    </PageContent>
  </>;
};

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  templateActions: {
    container: state.containerTemplateActions,
    sample: state.sampleTemplateActions,
  },
});

const mapDispatchToProps = dispatch => ({
  fetchAuthorizedData: () => dispatch(fetchAuthorizedData),
})

ActionContent.propTypes = {
  templateType: PropTypes.oneOf(["container", "sample"]).isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(ActionContent);
