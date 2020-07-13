import React, {useEffect} from "react";
import {connect} from "react-redux";
import {useHistory, useRouteMatch} from "react-router-dom";
import PropTypes from "prop-types";

import {Button} from "antd";
import "antd/es/button/style/css";

import {DownloadOutlined} from "@ant-design/icons";

import CONTAINERS from "../modules/containers/actions";
import SAMPLES from "../modules/samples/actions";

import AppPageHeader from "./AppPageHeader";
import PageContent from "./PageContent";
import TemplateFlow from "./TemplateFlow";

const ActionContent = ({templateType, templates, listActions}) => {
  const history = useHistory();
  const match = useRouteMatch();

  useEffect(() => {
    // Must be wrapped; effects cannot return promises
    listActions[templateType]();
  }, [templateType]);

  // TODO: Memoize this stuff
  const action = parseInt(match.params.action, 10) || 0;
  const actionsObj = templates[templateType] || {};
  const {name, description, template} = actionsObj.items[action] || {};

  // TODO: isFetching
  // TODO: Not found

  return <>
    {/* TODO: Navigate back */}
    <AppPageHeader title={name}
                   onBack={history.goBack}
                   extra={<Button onClick={() => window.location = template}>
                     <DownloadOutlined /> Download Template
                   </Button>} />
    <PageContent>
      <TemplateFlow uploadText={description} />
    </PageContent>
  </>;
};

const mapStateToProps = state => ({
  templates: {
    container: state.containerTemplateActions,
    sample: state.sampleTemplateActions,
  },
});

const mapDispatchToProps = dispatch => ({
  listActions: {
    container: () => dispatch(CONTAINERS.listTemplateActions()),
    sample: () => dispatch(SAMPLES.listTemplateActions()),
  }
});

ActionContent.propTypes = {
  templateType: PropTypes.oneOf(["container", "sample"]).isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(ActionContent);
