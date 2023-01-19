import React, {useEffect} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Card, Col, Row, Statistic} from "antd";

import CONTAINERS from "../modules/containers/actions";
import SAMPLES from "../modules/samples/actions";
import LIBRARIES from "../modules/libraries/actions";
import PROCESS_MEASUREMENTS from "../modules/processMeasurements/actions";
import PROJECTS from "../modules/projects/actions";
import INDICES from "../modules/indices/actions";

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
  librariesSummary,
  processMeasurementsSummary,
  projectsSummary,
  indicesSummary,
  protocolsByID,
  libraryTypesByID,
  templates,
  listActions,
}) => {
  useEffect(() => {
    listActions.container();
    listActions.sample();
    listActions.library();
    listActions.process();
    listActions.project();
    listActions.indices();
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
          <Card title="Projects" {...CARD_PROPS} style={{marginTop: "1rem"}}>
            <Row gutter={16}>
              <Col {...STATS_COL_PROPS}>
                <Statistic title="Total Projects" value={projectsSummary.total_count || "—"} />
              </Col>
              <Col {...STATS_COL_PROPS}>
                <Statistic title="Open Projects" value={projectsSummary.open_count || "—"} />
                <Statistic title="Closed Projects" value={projectsSummary.closed_count || "—"} />
              </Col>
            </Row>
            <Row gutter={16}>
              <Col {...WIDE_BUTTON_COL_PROPS}>
                <Link to='/projects/add/'>
                  <Button icon={actionIcon('Add')} style={{width: "100%"}}>Add One Project</Button>
                </Link>
              </Col>
              {actionsToButtonList("/projects", templates.project, true).map((l, i) =>
                <Col key={i} {...WIDE_BUTTON_COL_PROPS}>{l}</Col>
              )}
            </Row>
          </Card>
          <div style={{ display: 'flex', marginBottom: '1em' }}></div>
          <Card title="Indices" {...CARD_PROPS}>
            <Statistic title="Total Indices" value={indicesSummary.total_count || "—"} />
            <Row gutter={16}>
              {actionsToButtonList("/indices", templates.index, true).map((l, i) =>
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
          <div style={{ display: 'flex', marginBottom: '1em' }}></div>
          <Card title="Libraries" {...CARD_PROPS}>
            <Row gutter={16}>
              <Col {...STATS_COL_PROPS}>
                <Statistic title="Total Libraries" value={librariesSummary.total_count || "—"} />
              </Col>
              <Col {...STATS_COL_PROPS}>
                {((librariesSummary.library_type_counts && Object.keys(librariesSummary.library_type_counts)) || []).map((library_type) =>
                  <Statistic key={library_type} title={libraryTypesByID[library_type]?.name || "—"} value={librariesSummary.library_type_counts[library_type] || "—"} />
                )}
                  <Statistic title={"Pooled"} value={(librariesSummary.total_count - Object.values(librariesSummary.library_type_counts || {}).reduce((sum, type_count) => sum + type_count, 0)) || "—"} />
              </Col>
            </Row>
            <Row gutter={16}>
              {actionsToButtonList("/libraries", templates.library, true).map((l, i) =>
                <Col key={i} {...WIDE_BUTTON_COL_PROPS}>{l}</Col>
              )}
            </Row>
          </Card>
        </Col>
        <Col {...COL_LAYOUT}>
          <Card title="Protocols" {...CARD_PROPS}>
            <Row gutter={16}>
              <Col {...STATS_COL_PROPS}>
                <Statistic title="Total Protocols" value={processMeasurementsSummary.total_count || "—"} />
              </Col>
              <Col {...STATS_COL_PROPS}>
                {((processMeasurementsSummary.protocol_counts && Object.keys(processMeasurementsSummary.protocol_counts)) || []).map((protocol) =>
                  <Statistic key={protocol} title={protocolsByID[protocol]?.name} value={processMeasurementsSummary.protocol_counts[protocol] || "—"} />
                )}
              </Col>
            </Row>
            <Row gutter={16}>
              {actionsToButtonList("/process-measurements", templates.processMeasurement, true).map((l, i) =>
                <Col key={i} {...WIDE_BUTTON_COL_PROPS}>{l}</Col>
              )}
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
  librariesSummary: state.librariesSummary.data,
  processMeasurementsSummary: state.processMeasurementsSummary.data,
  projectsSummary: state.projectsSummary.data,
  indicesSummary: state.indicesSummary.data,
  protocolsByID: state.protocols.itemsByID,
  libraryTypesByID: state.libraryTypes.itemsByID,
  templates: {
    container: state.containerTemplateActions,
    sample: state.sampleTemplateActions,
    library: state.libraryTemplateActions,
    processMeasurement: state.processMeasurementTemplateActions,
    project: state.projectTemplateActions,
    index: state.indicesTemplateActions,
  },
});

const mapDispatchToProps = dispatch => ({
  listActions: {
    container: () => dispatch(CONTAINERS.listTemplateActions()),
    sample: () => dispatch(SAMPLES.listTemplateActions()),
    library: () => dispatch(LIBRARIES.listTemplateActions()),
    process: () => dispatch(PROCESS_MEASUREMENTS.listTemplateActions()),
    project: () => dispatch(PROJECTS.listTemplateActions()),
    indices: () => dispatch(INDICES.listTemplateActions()),
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(DashboardPage);
