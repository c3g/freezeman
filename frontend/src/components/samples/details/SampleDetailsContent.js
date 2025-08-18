import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Table,
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
import ExperimentRunsListSection from "../../shared/ExperimentRunsListSection";
import useHashURL from "../../../hooks/useHashURL";
import { isNullish } from "../../../utils/functions";
import { fetchProcessMeasurements } from "../../../modules/cache/cache";
import { WithContainerRenderComponent, WithCoordinateRenderComponent, WithIndexRenderComponent, WithIndividualRenderComponent, WithSampleRenderComponent } from "../../shared/WithItemRenderComponent";
import { useAppDispatch, useAppSelector } from "../../../hooks";
import { selectAuthTokenAccess, selectContainersByID, selectLibrariesByID, selectSampleKindsByID, selectSamplesByID, selectUsersByID } from "../../../selectors";
import { BiosampleIDToAlias } from "../SampleIdentityColumns";
import DropdownListItems from "../../DropdownListItems";

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

const tabStyle = {
  padding: "0 24px 24px 24px",
  overflow: "auto",
  height: "100%",
}

const lineageStyle = {
  ...tabStyle,
  overflow: 'hidden',
  height: '90vh'
}

const listSampleMetadata = (token, options) =>
  withToken(token, api.sampleMetadata.get)(options).then(res => res.data)

const SampleDetailsContent = () => {
  const dispatch = useAppDispatch()

  const samplesByID = useAppSelector(selectSamplesByID)
  const sampleKindsByID = useAppSelector(selectSampleKindsByID)
  const librariesByID = useAppSelector(selectLibrariesByID)
  const containersByID = useAppSelector(selectContainersByID)
  const usersByID = useAppSelector(selectUsersByID)
  const token = useAppSelector(selectAuthTokenAccess)

  const history = useNavigate();
  const { id } = useParams();

  const [timelineMarginLeft, timelineRef] = useTimeline();

  /**
   * @typedef {import("../../../models/frontend_models").Sample} Sample
   * @type {Sample | Record<string, undefined>}
   */
  const sample = useMemo(() => samplesByID[id] || {}, [id, samplesByID])
  const error = sample.error?.name !== 'APIError' ? sample.error : undefined;
  const isLoaded = samplesByID[id] && !sample.isFetching && !sample.didFail;
  const isFetching = !samplesByID[id] || sample.isFetching;
  const sampleKind = sampleKindsByID[sample.sample_kind]?.name ?? (sample.is_pool ? "Pool" : "")
  const tissueSource = sampleKindsByID[sample.tissue_source]?.name
  const volume = isNullish(sample.volume) ? '' : parseFloat(sample.volume).toFixed(3)
  const container = containersByID[sample.container]
  const experimentalGroups = sample.experimental_group || [];
  const versions = sample.versions;
  const isVersionsEmpty = versions && versions.length === 0;
  const isProcessesEmpty = sample.process_measurements && sample.process_measurements.length === 0;
  const flags = { quantity: sample.quantity_flag, quality: sample.quality_flag , identity: sample.identity_flag};
  const [processMeasurements, setProcessMeasurements] = useState([])
  const experimentRunsIDs = isLoaded && container?.experiment_run ? [container.experiment_run] : []
  const library = librariesByID[id]
  const quantity = library && library.quantity_ng ? parseFloat(library.quantity_ng).toFixed(3) : undefined
  const concentration_nm = library && library.concentration_nm ? parseFloat(library.concentration_nm).toFixed(3) : undefined
  const [sampleMetadata, setSampleMetadata] = useState([])
  const [activeKey, setActiveKey] = useHashURL('overview')


  // Navigate to a sample when the sample's node is clicked in the lineage graph.
  const navigateToSample = useCallback((sample_id) => {
    if (sample_id) {
      history(`/samples/${sample_id}#lineage`)
    }
  }, [history])

  // Navigate to a process measurement when the user clicks an edge
  // in the lineage graph.
  const navigateToProcess = useCallback((process_id) => {
    if (process_id) {
      history(`/process-measurements/${process_id}`)
    }
  }, [history])

  // TODO: This spams API requests
  useEffect(() => {
    if (!samplesByID[id])
      dispatch(getSample(id));
  }, [dispatch, id, samplesByID])

  useEffect(() => {
    if (isLoaded && !sample.versions && !sample.isFetching)
      dispatch(listVersions(sample.id));
  }, [dispatch, isLoaded, sample.id, sample.isFetching, sample.versions])

  useEffect(() => {
    if (isLoaded && !isProcessesEmpty) {
      fetchProcessMeasurements(sample.process_measurements).then((processMeasurements) => {
        setProcessMeasurements(processMeasurements)
      })
    }
  }, [isLoaded, isProcessesEmpty, sample.process_measurements])

  useEffect(() => {
    if (!librariesByID[id])
      dispatch(getLibrary(id))
  }, [dispatch, id, librariesByID])

  useEffect(() => {
    const biosampleId = sample?.biosample_id
    listSampleMetadata(token, { "biosample__id": biosampleId }).then(metadata => {
      setSampleMetadata(metadata)
    })
  }, [sample])


  /**
   * @typedef {import("../../../models/fms_api_models").FMSSampleIdentity} FMSSampleIdentity
   * @type {[FMSSampleIdentity | undefined, (value: FMSSampleIdentity) => void]}
   */
  const sampleIdentityState = useState(undefined);
  const [sampleIdentity, setSampleIdentity] = sampleIdentityState
  useEffect(() => {
    const biosampleId = sample?.biosample_id
    if (biosampleId) {
      const identities = dispatch(api.sampleIdentity.get(biosampleId))
      identities.then(({ data }) => {
        if (data.count > 0) {
          setSampleIdentity(data.results[0])
        }
      })
    }
  }, [dispatch, sample?.biosample_id, setSampleIdentity])
  const sampleIdentityItems = useMemo(() => {
    /**
     * @type {NonNullable<import("antd").DescriptionsProps['items']>}
     */
    const items = [
      {
        label: "Conclusive",
        key: "conclusive",
        children: sampleIdentity?.conclusive === undefined
          ? ""
          : sampleIdentity.conclusive ? "Yes" : "No"
      },
      {
        label: "Predicted Sex",
        key: "predicted_sex",
        children: sampleIdentity?.predicted_sex ?? ""
      },
      {
        label: "Sex Concordance",
        key: "sex_concordance",
        children: sampleIdentity?.sex_concordance === undefined
                        ? ""
                        : sampleIdentity.sex_concordance === null
                            ? "Inconclusive"
                            : sampleIdentity.sex_concordance ? "Match" : "Mismatch"
      },
    ]
    return items
  }, [sampleIdentity])
  const sampleIdentityMatchesColumns = useMemo(() => {
    /**
     * @type {NonNullable<import("antd").TableProps<import("../../../models/fms_api_models").FMSSampleIdentityMatch>['columns']>}
     */
    const columns = [
      {
        title: "Matching Biosample (Alias)",
        dataIndex: "matched_biosample_id",
        key: "biosample_alias",
        render: (matched_biosample_id) => {
          return <BiosampleIDToAlias biosampleId={matched_biosample_id} />
        }
      },
      {
        title: "Matching Site Ratio",
        dataIndex: "matching_site_ratio",
        key: "matching_site_ratio"
      },
      {
        title: "Compared Sites",
        dataIndex: "compared_sites",
        key: "compared_sites"
      }
    ]
    return columns
  }, [])

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
      <Tabs activeKey={activeKey} onChange={setActiveKey} size="large" type="card" className={(activeKey === 'lineage' ? 'lineage-tab-active' : '')}>
        <TabPane tab="Overview" key="overview" style={tabStyle}>
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
                    <WithIndividualRenderComponent objectID={sample.individual} render={(individual) => individual.name} placeholder={"Loading..."} />
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
            <Descriptions.Item label="Container Barcode">
              {sample.container &&
                <Link to={`/containers/${sample.container}`}>
                  <WithContainerRenderComponent objectID={sample.container} render={(container) => container.barcode} placeholder={"Loading..."} />
                </Link>
              }
            </Descriptions.Item>
            <Descriptions.Item label="Coordinates">
              {sample.coordinate
                ? <WithCoordinateRenderComponent objectID={sample.coordinate} render={(coordinate) => coordinate.name} placeholder={"Loading..."} />
                : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="QC Flag">
              {!isNullish(flags.quantity) || !isNullish(flags.quality) || !isNullish(flags.identity)
                ? <QCFlag flags={flags} />
                : null}
            </Descriptions.Item>
            <Descriptions.Item label="Comment" span={3}>{sample.comment}</Descriptions.Item>
          </Descriptions>
          {sample.extracted_from ? (
            <Descriptions bordered={true} size="small" title="Extraction Details" style={{ marginTop: "24px" }}>
              <Descriptions.Item label="Extracted From">
                <Link to={`/samples/${sample.extracted_from}`}>
                  <WithSampleRenderComponent objectID={sample.extracted_from} render={(sample) => sample.name} placeholder={"Loading..."}/>
                </Link>
                {" ("}
                <WithSampleRenderComponent objectID={sample.extracted_from} render={(sample) => <WithContainerRenderComponent
                  objectID={sample.container} render={(container) => container.barcode} placeholder={"..."}
                />} placeholder={"..."} />
                <WithSampleRenderComponent objectID={sample.extracted_from} render={(sample) => <WithCoordinateRenderComponent
                  objectID={sample.coordinate} render={(coordinates) => ` at ${coordinates.name}`}
                />} />
                {")"}
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
                  {library?.index && 
                  <Link to={`/indices/${library?.index}`}>
                    <WithIndexRenderComponent objectID={library?.index} render={(index) => index.name} placeholder={"Loading..."}/>
                  </Link>}
                </Descriptions.Item>
                <Descriptions.Item label="Library Size (bp)">{sample?.fragment_size}</Descriptions.Item>
                <Descriptions.Item label="Concentration (nM)">{library?.concentration_nm && concentration_nm}</Descriptions.Item>
                <Descriptions.Item label="NA Quantity (ng)">{library?.quantity_ng && quantity}</Descriptions.Item>
              </Descriptions>
              <Descriptions bordered={true} size="small" style={{ marginTop: "24px" }}>
                <Descriptions.Item label="Library Selection Method">{library?.library_selection}</Descriptions.Item>
                <Descriptions.Item label="Library Selection Target">{library?.library_selection_target}</Descriptions.Item>
              </Descriptions>
            </>
          ) : null}

          {sampleIdentity &&
            <>
              <Title level={5} style={{ marginTop: '1rem' }}> Identity QC </Title>
              <Descriptions bordered={true} size="small" column={3} items={sampleIdentityItems}/>
              <div style={{ marginTop: '1rem' }} />
              {sampleIdentity.identity_matches.length > 0 &&
                <Table dataSource={sampleIdentity.identity_matches} columns={sampleIdentityMatchesColumns} size={"small"} pagination={false} />}
            </>
          }

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

        <TabPane tab={`Processes (${processMeasurements.length})`} key="processes" style={tabStyle}>
          <SampleDetailsProcessMeasurements processMeasurements={processMeasurements}/>
        </TabPane>

        <TabPane tab={`Experiment (${experimentRunsIDs.length})`} key="experiment" style={tabStyle}>
           <ExperimentRunsListSection experimentRunsIDs={experimentRunsIDs} />
        </TabPane>

        <TabPane tab={"Associated Projects"} key="associated-projects" style={tabStyle}>
          <SamplesAssociatedProjects sampleID={sample.id} />
        </TabPane>

        <TabPane tab={`Metadata`} key="metadata" style={tabStyle}>
          <Title level={5} style={{ marginTop: '1rem'}}> Metadata </Title>
          <Descriptions bordered={true} size="small">
            {
              sampleMetadata.map((metadata, index) => {
                return <Descriptions.Item key={index} label={metadata?.name}>{metadata?.value} </Descriptions.Item>
              })
            }

          </Descriptions>
        </TabPane>

        <TabPane tab={`Lineage`} key="lineage" style={lineageStyle}>
          <SampleDetailsLineage sample={sample} 
            handleSampleClick={navigateToSample}
            handleProcessClick={navigateToProcess}
          />
        </TabPane>

        <TabPane tab={`Pool`} key="pool" style={tabStyle}>
          <SampleDetailsPool sample={sample}></SampleDetailsPool>
        </TabPane>
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

export default SampleDetailsContent
