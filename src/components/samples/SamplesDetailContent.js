import React from "react";
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import {Link, useHistory, useParams} from "react-router-dom";
import {format} from "date-fns";

import {UserOutlined} from "@ant-design/icons";
import {Card, Descriptions, Tag, Timeline, Typography, Row, Col} from "antd";
import "antd/es/typography/style/css";
import "antd/es/timeline/style/css";
import "antd/es/descriptions/style/css";
import "antd/es/tag/style/css";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import {SampleDepletion} from "./SampleDepletion";
import {listVersions} from "../../modules/samples/actions";
import renderSampleDiff from "../../utils/renderSampleDiff";

const { Title, Text } = Typography;

const timelineStyle = {
  marginLeft: -250,
}


const mapStateToProps = state => ({
  samplesByID: state.samples.itemsByID,
  usersByID: state.users.itemsByID,
});

const mapDispatchToProps = dispatch =>
  bindActionCreators({ listVersions }, dispatch);

const SamplesDetailContent = ({samplesByID, usersByID, listVersions}) => {
  const history = useHistory();
  const {id} = useParams();
  const sample = samplesByID[id];

  if (!sample) return null;

  const isFetching = sample.isFetching;
  const volume = parseFloat(sample.volume_history[sample.volume_history.length - 1].volume_value).toFixed(3);
  const experimentalGroups = sample.experimental_group || [];
  const extractedFrom = sample.extracted_from === null ? null : samplesByID[sample.extracted_from];
  const volumeUsed = extractedFrom ? parseFloat(sample.volume_used).toFixed(3) : null;
  const versions = sample.versions;

  if (!sample.versions && !sample.isFetching)
      listVersions(sample.id);

  return <>
    <AppPageHeader title={sample.name} onBack={history.goBack} extra={[
        <div key="kind" style={{display: "inline-block", verticalAlign: "top", marginTop: "4px"}}>
            <Tag>{sample.biospecimen_type}</Tag>
        </div>,
        <div key="depleted" style={{
            display: "inline-block",
            verticalAlign: "top",
            marginTop: "4px",
            marginLeft: "4px",
        }}>
            <Tag color={sample.depleted ? "red" : "green"}>{sample.depleted ? "" : "NOT "}DEPLETED</Tag>
        </div>,
    ]} />
    <PageContent>
      <Title level={2}>Overview</Title>

      <Descriptions bordered={true} size="small">
          <Descriptions.Item label="Name">{sample.name}</Descriptions.Item>
          <Descriptions.Item label="Alias">{sample.alias}</Descriptions.Item>
          <Descriptions.Item label="Biospecimen Type">{sample.biospecimen_type}</Descriptions.Item>
          <Descriptions.Item label="Volume">{volume} µL</Descriptions.Item>
          <Descriptions.Item label="Concentration">
              {sample.concentration === null
                  ? "—"
                  : `${parseFloat(sample.concentration).toFixed(3)} ng/uL`}
          </Descriptions.Item>
          <Descriptions.Item label="Depleted"><SampleDepletion depleted={sample.depleted} /></Descriptions.Item>
      </Descriptions>
      <Descriptions bordered={true} size="small" style={{marginTop: "24px"}}>
          <Descriptions.Item label="Individual">
              <Link to={`/individuals/${sample.individual}`}>{sample.individual}</Link>
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
              <Link to={`/containers/${sample.container}`}>{sample.container}</Link>
          </Descriptions.Item>
          <Descriptions.Item label="Coordinates">{sample.coordinates || "—"}</Descriptions.Item>
          <Descriptions.Item label="Comment" span={3}>{sample.comment}</Descriptions.Item>

          {/*TODO: Extracted from*/}
      </Descriptions>

      {extractedFrom ? (
        <Descriptions bordered={true} size="small" title="Extraction Details" style={{marginTop: "24px"}}>
          <Descriptions.Item label="Extracted From">
            <Link to={`/samples/${extractedFrom.id}`}>
              {extractedFrom.name} ({extractedFrom.container}{extractedFrom.coordinates
                  ? ` at ${extractedFrom.coordinates}` : ""})
            </Link>
          </Descriptions.Item>
          <Descriptions.Item label="Volume Used">{volumeUsed}</Descriptions.Item>
        </Descriptions>
      ) : null}

      <Title level={2} style={{ marginTop: '1em' }}>Versions</Title>
      <Row>
        <Col sm={24} md={24}>
          <Card>
            <Timeline mode="left" style={timelineStyle}>
              {versions === undefined && isFetching &&
                <Timeline.Item pending={true}>Loading...</Timeline.Item>
              }
              {versions && versions.map((version, i) =>
                <Timeline.Item
                  label={renderTimelineLabel(version, usersByID)}
                >
                  <strong>{version.revision.comment}</strong>
                  {renderSampleDiff(versions[i + 1], version)}
                </Timeline.Item>
              )}
            </Timeline>
          </Card>
        </Col>
      </Row>
    </PageContent>
  </>;
};

const usernameStyle = {
  cursor: 'default',
}

function renderTimelineLabel(version, usersByID) {
  const user = usersByID[version.revision.user];
  return (
    <div>
      <div><Text type="secondary">{dateToString(version.revision.date_created)}</Text></div>
      <div><Text disabled style={usernameStyle}><UserOutlined /> {user.username}</Text></div>
    </div>
  )
}

function dateToString(date) {
  return format(new Date(date), "yyyy-MMM-dd HH:mm:ss")
}

export default connect(mapStateToProps, mapDispatchToProps)(SamplesDetailContent);
