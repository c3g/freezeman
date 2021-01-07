import React from "react";
import {connect} from "react-redux";
import {Link, useHistory, useParams} from "react-router-dom";

import {LoadingOutlined, UserOutlined} from "@ant-design/icons";
import {
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Space,
  Tag,
  Timeline,
  Typography
} from "antd";
import "antd/es/card/style/css";
import "antd/es/col/style/css";
import "antd/es/descriptions/style/css";
import "antd/es/empty/style/css";
import "antd/es/row/style/css";
import "antd/es/space/style/css";
import "antd/es/tag/style/css";
import "antd/es/timeline/style/css";
import "antd/es/typography/style/css";

import dateToString from "../../utils/dateToString";
import useTimeline from "../../utils/useTimeline";
import renderSampleDiff from "../../utils/renderSampleDiff";
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import ErrorMessage from "../ErrorMessage";
import EditButton from "../EditButton";
import {SampleDepletion} from "./SampleDepletion";
import {get as getSample, listVersions} from "../../modules/samples/actions";
import {withContainer, withSample, withIndividual} from "../../utils/withItem";

const { Title, Text } = Typography;

const usernameStyle = {
  cursor: 'default',
}

const depletedStyle = {
  display: "inline-block",
  verticalAlign: "top",
  marginTop: "4px",
  marginLeft: "4px",
};

const mapStateToProps = state => ({
  samplesByID: state.samples.itemsByID,
  containersByID: state.containers.itemsByID,
  individualsByID: state.individuals.itemsByID,
  usersByID: state.users.itemsByID,
});

const actionCreators = {getSample, listVersions};

const SamplesDetailContent = ({samplesByID, containersByID, individualsByID, usersByID, getSample, listVersions}) => {
  const history = useHistory();
  const {id} = useParams();

  const [timelineMarginLeft, timelineRef] = useTimeline();

  const sample = samplesByID[id] || {};
  const error = sample.error;
  const isLoaded = samplesByID[id] && !sample.isFetching && !sample.didFail;
  const isFetching = !samplesByID[id] || sample.isFetching;
  const volume = sample.volume_history
    ? parseFloat(sample.volume_history[sample.volume_history.length - 1].volume_value).toFixed(3)
    : null;
  const experimentalGroups = sample.experimental_group || [];
  const volumeUsed = sample.extracted_from ? parseFloat(sample.volume_used).toFixed(3) : null;
  const versions = sample.versions;
  const isVersionsEmpty = versions && versions.length === 0;

  // TODO: This spams API requests
  if (!samplesByID[id])
    getSample(id);

  if (isLoaded && !sample.versions && !sample.isFetching)
    listVersions(sample.id);

  return <>
    <AppPageHeader
      title={`Sample ${sample.name || id}`}
      onBack={() => history.push("/samples/list")}
      extra={isLoaded ?
        <Space>
          <div key="kind" style={{display: "inline-block", verticalAlign: "top", marginTop: "4px"}}>
              <Tag>{sample.biospecimen_type}</Tag>
          </div>
          <div key="depleted" style={depletedStyle}>
              <Tag color={sample.depleted ? "red" : "green"}>{sample.depleted ? "" : "NOT "}DEPLETED</Tag>
          </div>
          <EditButton url={`/samples/${id}/update`} />
        </Space>
      : []}
    />
    <PageContent loading={isFetching}>
      {error &&
        <ErrorMessage error={error} />
      }

      <Title level={2}>Overview</Title>

      <Descriptions bordered={true} size="small">
          <Descriptions.Item label="Name">{sample.name}</Descriptions.Item>
          <Descriptions.Item label="Alias">{sample.alias}</Descriptions.Item>
          <Descriptions.Item label="Biospecimen Type">{sample.biospecimen_type}</Descriptions.Item>
          <Descriptions.Item label="Volume">{volume} µL</Descriptions.Item>
          <Descriptions.Item label="Concentration">
              {sample.concentration == null
                  ? "—"
                  : `${parseFloat(sample.concentration).toFixed(3)} ng/uL`}
          </Descriptions.Item>
          <Descriptions.Item label="Depleted"><SampleDepletion depleted={sample.depleted} /></Descriptions.Item>
      </Descriptions>
      <Descriptions bordered={true} size="small" style={{marginTop: "24px"}}>
        <Descriptions.Item label="Individual Name">
            {sample.individual &&
              <Link to={`/individuals/${sample.individual}`}>
                {
                  withIndividual(
                    individualsByID,
                    sample.individual,
                    individual => individual.label,
                    "Loading..."
                  )
                }
              </Link>
            }
          </Descriptions.Item>
          <Descriptions.Item label="Collection Site">{sample.collection_site}</Descriptions.Item>
          <Descriptions.Item label="Tissue Source">{sample.tissue_source}</Descriptions.Item>
          <Descriptions.Item label="Experimental Groups" span={2}>
              {experimentalGroups.map((g, i) =>
                  <span key={g}>{g}{i === experimentalGroups.length - 1 ? "" : ", "}</span>)}
          </Descriptions.Item>
          <Descriptions.Item label="Phenotype">{sample.phenotype}</Descriptions.Item>
          <Descriptions.Item label="Reception Date">{sample.reception_date}</Descriptions.Item>
          <Descriptions.Item label="Container">
            {sample.container &&
              <Link to={`/containers/${sample.container}`}>
                {withContainer(containersByID, sample.container, container => container.barcode, "Loading...")}
              </Link>
            }
          </Descriptions.Item>
          <Descriptions.Item label="Coordinates">{sample.coordinates || "—"}</Descriptions.Item>
          <Descriptions.Item label="Comment" span={3}>{sample.comment}</Descriptions.Item>

          {/*TODO: Extracted from*/}
      </Descriptions>

      {sample.extracted_from ? (
        <Descriptions bordered={true} size="small" title="Extraction Details" style={{marginTop: "24px"}}>
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
          <Descriptions.Item label="Volume Used">{volumeUsed}</Descriptions.Item>
        </Descriptions>
      ) : null}

      <Title level={2} style={{ marginTop: '1em' }}>Versions</Title>
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
                      const diff = renderSampleDiff(versions[i + 1], version);
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
    </PageContent>
  </>;
};

function renderTimelineLabel(version, usersByID) {
  const user = usersByID[version.revision.user];
  return (
    <div>
      <div><Text type="secondary">{dateToString(version.revision.date_created)}</Text></div>
      <div><Text disabled style={usernameStyle}><UserOutlined /> {user.username}</Text></div>
    </div>
  )
}

export default connect(mapStateToProps, actionCreators)(SamplesDetailContent);
