import React, {useEffect} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Card, Col, Row, Statistic} from "antd";

import CONTAINERS from "../modules/containers/actions";
import SAMPLES from "../modules/samples/actions";
import PROCESSES from "../modules/processes/actions";

import {actionsToButtonList, actionIcon} from "../utils/templateActions";

import AppPageHeader from "./AppPageHeader";
import PageContainer from "./PageContainer";
import PageContent from "./PageContent";

const COL_LAYOUT = {
  lg: 8,
  xs: 24,
  style: {marginTop: "16px"}
};

const CARD_PROPS = {
  size: "small",
};

const STATS_COL_PROPS = {
  xs: 12,
};

const WIDE_BUTTON_COL_PROPS = {
  xs: 24,
  style: {marginTop: "8px"},
};

const DashboardPage = ({
  containersSummary,
  samplesSummary,
  processesSummary,
  protocolsByID,
  templates,
  listActions,
}) => {
  useEffect(() => {
    listActions.container();
    listActions.sample();
    listActions.process();
  }, []);

  return <PageContainer>
    <AppPageHeader title="Dashboard" />
    <PageContent style={{padding: "0 24px 24px 24px"}}>
      <Row gutter={16}>
        <Col {...COL_LAYOUT}>
          <Card title="Containers" {...CARD_PROPS}>
            <Statistic title="Total Containers" value={containersSummary.total_count || "—"} />
            {/* TODO: Root containers */}
            <Row gutter={16}>
              <Col {...WIDE_BUTTON_COL_PROPS}>
                <Link to='/containers/add/'>
                  <Button icon={actionIcon('Add')} style={{width: "100%"}}>Add One Container</Button>
                </Link>
              </Col>
              {actionsToButtonList("/containers", templates.container, true).map((l, i) =>
                <Col key={i} {...WIDE_BUTTON_COL_PROPS}>{l}</Col>
              )}
            </Row>
          </Card>
        </Col>
        <Col {...COL_LAYOUT}>
          <Card title="Samples" {...CARD_PROPS}>
            <Row gutter={16}>
              <Col {...STATS_COL_PROPS}>
                <Statistic title="Total Samples" value={samplesSummary.total_count || "—"} />
              </Col>
            </Row>
            <Row gutter={16}>
              <Col {...WIDE_BUTTON_COL_PROPS}>
                <Link to='/samples/add/'>
                  <Button icon={actionIcon('Add')} style={{width: "100%"}}>Add One Sample</Button>
                </Link>
              </Col>
              {actionsToButtonList("/samples", templates.sample, true).map((l, i) =>
                <Col key={i} {...WIDE_BUTTON_COL_PROPS}>{l}</Col>
              )}
            </Row>
          </Card>
        </Col>
        <Col {...COL_LAYOUT}>
          <Card title="Protocols" {...CARD_PROPS}>
            <Row gutter={16}>
              <Col {...STATS_COL_PROPS}>
                <Statistic title="Total Protocols" value={processesSummary.total_count || "—"} />
              </Col>
              <Col {...STATS_COL_PROPS}>
                {((processesSummary.protocol_counts && Object.keys(processesSummary.protocol_counts)) || []).map((protocol) => 
                  <Statistic title={protocolsByID[protocol]?.name} value={processesSummary.protocol_counts[protocol] || "—"} />
                )}
              </Col>
            </Row>
            <Row gutter={16}>
              {actionsToButtonList("/processes", templates.process, true).map((l, i) =>
                <Col key={i} {...WIDE_BUTTON_COL_PROPS}>{l}</Col>
              )}
            </Row>
          </Card>
          <div style={{ display: 'flex', marginBottom: '1em' }}></div>
          <Card title="Other" {...CARD_PROPS}>
            <Row gutter={16}>
              <Col {...WIDE_BUTTON_COL_PROPS}>
                <Link to="/individuals/add/">
                  <Button icon={actionIcon("Add")} style={{width: "100%"}}>Add Individual</Button>
                </Link>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </PageContent>
  </PageContainer>;
}

const mapStateToProps = state => ({
  containersSummary: state.containersSummary.data,
  samplesSummary: state.samplesSummary.data,
  processesSummary: state.processesSummary.data,
  protocolsByID: state.protocols.itemsByID,
  templates: {
    container: state.containerTemplateActions,
    sample: state.sampleTemplateActions,
    process: state.processTemplateActions,
  },
});

const mapDispatchToProps = dispatch => ({
  listActions: {
    container: () => dispatch(CONTAINERS.listTemplateActions()),
    sample: () => dispatch(SAMPLES.listTemplateActions()),
    process: () => dispatch(PROCESSES.listTemplateActions()),
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(DashboardPage);
