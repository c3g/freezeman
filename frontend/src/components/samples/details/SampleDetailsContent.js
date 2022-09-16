import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";

import { QCFlag } from "../../QCFlag";
import { LoadingOutlined, UserOutlined } from "@ant-design/icons";
import {
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Space,
  Tabs,
  Tag,
  Timeline,
  Typography
} from "antd";

import dateToString from "../../../utils/dateToString";
import useTimeline from "../../../utils/useTimeline";
import renderSampleDiff from "../../../utils/renderSampleDiff";
import AppPageHeader from "../../AppPageHeader";
import PageContent from "../../PageContent";
import ErrorMessage from "../../ErrorMessage";
import EditButton from "../../EditButton";
import TrackingFieldsContent from "../../TrackingFieldsContent";
import SamplesAssociatedProjects from "../SamplesAssociatedProjects";
import { Depletion } from "../../Depletion";
import SampleDetailsProcessMeasurements from "./SampleDetailsProcessMeasurements";
import SampleDetailsLineage from "./SampleDetailsLineage";
import SampleDetailsPool from './SampleDetailsPool'
import { get as getSample, listVersions } from "../../../modules/samples/actions";
import { get as getLibrary } from "../../../modules/libraries/actions";
import api, { withToken } from "../../../utils/api";
import {
  withContainer,
  withSample,
  withIndividual,
  withProcessMeasurement,
  withProject,
  withLibrary,
  withIndex
} from "../../../utils/withItem";
import ExperimentRunsListSection from "../../shared/ExperimentRunsListSection";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const usernameStyle = {
  cursor: 'default',
}

const depletedStyle = {
  display: "inline-block",
  verticalAlign: "top",
  marginTop: "4px",
  marginLeft: "4px",
};

const pageStyle = {
  padding: 0,
  overflow: "hidden",
}

const tabsStyle = {
  marginTop: 8,
}

const tabStyle = {
  padding: "0 24px 24px 24px",
  overflow: "auto",
  height: "100%",
}

const listSampleMetadata = (token, options) =>
  withToken(token, api.sampleMetadata.get)(options).then(res => res.data)

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  samplesByID: state.samples.itemsByID,
  sampleKindsByID: state.sampleKinds.itemsByID,
  containersByID: state.containers.itemsByID,
  processMeasurementsByID: state.processMeasurements.itemsByID,
  individualsByID: state.individuals.itemsByID,
  librariesByID: state.libraries.itemsByID,
  indicesByID: state.indices.itemsByID,
  usersByID: state.users.itemsByID,
  projectsByID: state.projects.itemsByID,
});

const actionCreators = { getSample, listVersions };

const SampleDetailsContent = ({
  token,
  samplesByID,
  sampleKindsByID,
  containersByID,
  processMeasurementsByID,
  individualsByID,
  librariesByID,
  indicesByID,
  usersByID,
  projectsByID,
  getSample,
  listVersions
}) => {
  const history = useNavigate();
  const { id } = useParams();

  const [timelineMarginLeft, timelineRef] = useTimeline();

  const sample = samplesByID[id] || {};
  const error = sample.error?.name !== 'APIError' ? sample.error : undefined;
  const isLoaded = samplesByID[id] && !sample.isFetching && !sample.didFail;
  const isFetching = !samplesByID[id] || sample.isFetching;
  const sampleKind = sampleKindsByID[sample.sample_kind]?.name
  const tissueSource = sampleKindsByID[sample.tissue_source]?.name
  const volume = sample.volume ? parseFloat(sample.volume).toFixed(3) : undefined
  const container = containersByID[sample.container]
  const experimentalGroups = sample.experimental_group || [];
  const versions = sample.versions;
  const isVersionsEmpty = versions && versions.length === 0;
  const isProcessesEmpty = sample.process_measurements && sample.process_measurements.length === 0;
  const isProjectsEmpty = sample.projects && sample.projects.length === 0;
  const flags = { quantity: sample.quantity_flag, quality: sample.quality_flag };
  let processMeasurements = []
  let experimentRunsIDs = []
  const library = librariesByID[id]
  const quantity = library && library.quantity_ng ? parseFloat(library.quantity_ng).toFixed(3) : undefined
  const concentration_nm = library && library.concentration_nm ? parseFloat(library.concentration_nm).toFixed(3) : undefined
  const [sampleMetadata, setSampleMetadata] = useState([])

  // TODO: This spams API requests
  if (!samplesByID[id])
    getSample(id);

  if (isLoaded && !sample.versions && !sample.isFetching)
    listVersions(sample.id);

  if (isLoaded && !isProcessesEmpty) {
    sample.process_measurements.forEach((id, i) => {
      withProcessMeasurement(processMeasurementsByID, id, process => process.id);
      processMeasurements.push(processMeasurementsByID[id]);
    })
  }

  if (isLoaded && container?.experiment_run) {
    experimentRunsIDs.push(container.experiment_run)
  }

  if (!librariesByID[id])
    getLibrary(id)

  useEffect(() => {
    const biosampleId = sample?.biosample_id
    listSampleMetadata(token, { "biosample__id": biosampleId }).then(metadata => {
      setSampleMetadata(metadata)
    })
  }, [sample])

  return <>
    <AppPageHeader
      title={`Sample ${sample.name || id}`}
      extra={isLoaded ?
        <Space>
          <div key="kind" style={{ display: "inline-block", verticalAlign: "top", marginTop: "4px" }}>
            <Tag>{sampleKind}</Tag>
          </div>
          <div key="depleted" style={depletedStyle}>
            <Tag color={sample.depleted ? "red" : "green"}>{sample.depleted ? "" : "NOT "}DEPLETED</Tag>
          </div>
          <EditButton url={`/samples/${id}/update`} />
        </Space>
        : []}
    />

    <PageContent loading={isFetching} style={pageStyle} tabs={true}>
      {error &&
        <ErrorMessage error={error} />
      }
      <Tabs defaultActiveKey="1" size="large" type="card" style={tabsStyle}>
        <TabPane tab="Overview" key="1" style={tabStyle}>
          <Descriptions bordered={true} size="small">
            <Descriptions.Item label="ID">{sample.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{sample.name}</Descriptions.Item>
            <Descriptions.Item label="Alias">{sample.alias}</Descriptions.Item>
            <Descriptions.Item label="Sample Kind">{sampleKind}</Descriptions.Item>
            <Descriptions.Item label="Volume (µL)">{volume}</Descriptions.Item>
            <Descriptions.Item label="Concentration (ng/µL)">
              {sample.concentration == null
                ? "—"
                : `${parseFloat(sample.concentration).toFixed(3)}`}
            </Descriptions.Item>
            <Descriptions.Item label="Depleted"><Depletion depleted={sample.depleted} /></Descriptions.Item>
          </Descriptions>
          <Descriptions bordered={true} size="small" style={{ marginTop: "24px" }}>
            <Descriptions.Item label="Individual Name">
              {sample.individual &&
                <Link to={`/individuals/${sample.individual}`}>
                  {
                    withIndividual(
                      individualsByID,
                      sample.individual,
                      individual => individual.name,
                      "Loading..."
                    )
                  }
                </Link>
              }
            </Descriptions.Item>
            <Descriptions.Item label="Collection Site">{sample.collection_site}</Descriptions.Item>
            <Descriptions.Item label="Tissue Source">{tissueSource}</Descriptions.Item>
            <Descriptions.Item label="Experimental Groups" span={2}>
              {experimentalGroups.map((g, i) =>
                <span key={g}>{g}{i === experimentalGroups.length - 1 ? "" : ", "}</span>)}
            </Descriptions.Item>
            <Descriptions.Item label="Reception/Creation Date">{sample.creation_date}</Descriptions.Item>
            <Descriptions.Item label="Container">
              {sample.container &&
                <Link to={`/containers/${sample.container}`}>
                  {withContainer(containersByID, sample.container, container => container.barcode, "Loading...")}
                </Link>
              }
            </Descriptions.Item>
            <Descriptions.Item label="Coordinates">{sample.coordinates || "—"}</Descriptions.Item>
            <Descriptions.Item label="QC Flag">
              {flags.quantity !== null && flags.quality !== null
                ? <QCFlag flags={flags} />
                : null}
            </Descriptions.Item>
            <Descriptions.Item label="Comment" span={3}>{sample.comment}</Descriptions.Item>
          </Descriptions>
          {sample.extracted_from ? (
            <Descriptions bordered={true} size="small" title="Extraction Details" style={{ marginTop: "24px" }}>
              <Descriptions.Item label="Extracted From">
                <Link to={`/samples/${sample.extracted_from}`}>
                  {withSample(samplesByID, sample.extracted_from, sample => sample.name, "Loading...")}
                </Link>
                {" "}(
                {withContainer(containersByID,
                  withSample(samplesByID, sample.extracted_from, sample => sample.container),
                  container => container.barcode,
                  "... ")}
                {withSample(samplesByID, sample.extracted_from, sample => sample.coordinates) &&
                  ` at ${withSample(samplesByID, sample.extracted_from, sample => sample.coordinates)}`}
                )
              </Descriptions.Item>
            </Descriptions>
          ) : null}

          {sample && sample.is_library ? (
            <>
              <Title level={5} style={{ marginTop: '1rem' }}> Library Information </Title>
              <Descriptions bordered={true} size="small">
                <Descriptions.Item label="Library Type">{library?.library_type}</Descriptions.Item>
                <Descriptions.Item label="Platform">{library?.platform}</Descriptions.Item>
                <Descriptions.Item label="Index">
                  <Link to={`/samples/${sample.extracted_from}`}>
                    {withIndex(indicesByID, library?.index, index => index.name, "Loading...")}
                  </Link>
                </Descriptions.Item>
                <Descriptions.Item label="Library Size (bp)">{library?.library_size}</Descriptions.Item>
                <Descriptions.Item label="Concentration (nM)">{library?.concentration_nm && concentration_nm}</Descriptions.Item>
                <Descriptions.Item label="NA Quantity (ng)">{library?.quantity_ng && quantity}</Descriptions.Item>
              </Descriptions>
            </>
          ) : null}

          <TrackingFieldsContent entity={sample} />
          <Title level={2} style={{ marginTop: '1rem' }}>Versions</Title>
          <Row>
            <Col sm={24} md={24}>
              <div ref={timelineRef}>
                <Card>
                  {
                    isVersionsEmpty ?
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> :
                      <Timeline mode="left" style={{ marginLeft: timelineMarginLeft }}>
                        {versions === undefined && isFetching &&
                          <Timeline.Item dot={<LoadingOutlined />} label=" ">Loading...</Timeline.Item>
                        }
                        {versions && versions.map((version, i) => {
                          const diff = renderSampleDiff(versions[i + 1], version, usersByID);
                          if (!diff)
                            return diff;
                          return (
                            <Timeline.Item
                              key={i}
                              label={renderTimelineLabel(version, usersByID)}
                            >
                              <strong>{version.revision.comment}</strong>
                              {diff}
                            </Timeline.Item>
                          )
                        })}
                      </Timeline>
                  }
                </Card>
              </div>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab={`Processes (${processMeasurements.length})`} key="2" style={tabStyle}>
          <SampleDetailsProcessMeasurements processMeasurements={processMeasurements} />
        </TabPane>

        <TabPane tab={`Experiment (${experimentRunsIDs?.length})`} key="3" style={tabStyle}>
          <ExperimentRunsListSection experimentRunsIDs={experimentRunsIDs} />
        </TabPane>

        <TabPane tab={"Associated Projects"} key="4" style={tabStyle}>
          <SamplesAssociatedProjects sampleID={sample.id} />
        </TabPane>

        <TabPane tab={`Metadata`} key="5" style={tabStyle}>
          <Title level={5} style={{ marginTop: '1rem' }}> Metadata </Title>
          <Descriptions bordered={true} size="small">
            {
              sampleMetadata.map(metadata => {
                return <Descriptions.Item label={metadata?.name}>{metadata?.value} </Descriptions.Item>
              })
            }

          </Descriptions>
        </TabPane>

        <TabPane tab={`Lineage`} key="6" style={tabStyle}>
          <SampleDetailsLineage sample={sample} />
        </TabPane>

        // Only display the Pool tab if the sample is a pool
        {sample.is_pool &&
          <TabPane tab="Pool" key="7" style={tabStyle}>
            <SampleDetailsPool sample={sample}></SampleDetailsPool>
          </TabPane>
        }
      </Tabs>

    </PageContent>
  </>;
};

function renderTimelineLabel(version, usersByID) {
  const user = usersByID[version.revision.user];
  const username = user?.username ?? "Loading...";

  return (
    <div>
      <div><Text type="secondary">{dateToString(version.revision.date_created)}</Text></div>
      <div><Text disabled style={usernameStyle}><UserOutlined /> {username}</Text></div>
    </div>
  )
}

export default connect(mapStateToProps, actionCreators)(SampleDetailsContent);
