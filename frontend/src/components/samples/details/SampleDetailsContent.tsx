import React, { LegacyRef, useCallback, useEffect, useMemo, useState } from "react";
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
  withCoordinate,
  withIndividual,
  withProcessMeasurement,
  withIndex
} from "../../../utils/withItem";
import ExperimentRunsListSection from "../../shared/ExperimentRunsListSection";
import useHashURL from "../../../hooks/useHashURL";
import { isNullish } from "../../../utils/functions";
import { Library, ProcessMeasurement, Sample } from "../../../models/frontend_models";
import { useAppDispatch, useAppSelector } from "../../../hooks";
import { selectAuthTokenAccess, selectContainersByID, selectCoordinatesByID, selectIndicesByID, selectIndividualsByID, selectLibrariesByID, selectProcessMeasurementsByID, selectSampleKindsByID, selectSamplesByID, selectUsersByID } from "../../../selectors";
import { FMSId } from "../../../models/fms_api_models";

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
  const history = useNavigate();
  const { id } = useParams();

  const dispatch = useAppDispatch()

  const token = useAppSelector(selectAuthTokenAccess)
  const samplesByID = useAppSelector(selectSamplesByID)
  const sampleKindsByID = useAppSelector(selectSampleKindsByID)
  const containersByID = useAppSelector(selectContainersByID)
  const librariesByID = useAppSelector(selectLibrariesByID)
  const processMeasurementsByID = useAppSelector(selectProcessMeasurementsByID)
  const individualsByID = useAppSelector(selectIndividualsByID)
  const indicesByID = useAppSelector(selectIndicesByID)
  const usersByID = useAppSelector(selectUsersByID)
  const coordinatesByID = useAppSelector(selectCoordinatesByID)
  
  const [timelineMarginLeft, timelineRef] = useTimeline();

  const sample: Sample | undefined = id && samplesByID[id];

  const error = sample?.error?.name !== 'APIError' ? sample?.error : undefined;
  const isLoaded = !!sample?.isLoaded;
  const isFetching = !!sample?.isFetching;
  const sampleKind = !isFetching && sample && sampleKindsByID[sample.sample_kind]?.name
  const tissueSource = !isFetching && sample?.tissue_source ? sampleKindsByID[sample.tissue_source]?.name : undefined
  const volume = !isFetching && sample ? sample.volume.toFixed(3) : ''
  const container = !isFetching ? sample && containersByID[sample.container] : undefined
  const experimentalGroups = sample?.experimental_group ?? [] ;
  const versions = sample?.versions
  const isVersionsEmpty = !!versions && versions.length === 0;
  const isProcessesEmpty = sample?.process_measurements && sample.process_measurements.length === 0;
  const flags = { quantity: sample?.quantity_flag, quality: sample?.quality_flag };
  const [processMeasurements, setProcessMeasurements] = useState<ProcessMeasurement[]>([])
  const experimentRunsIDs = container?.experiment_run ? [container?.experiment_run] : []
  const library: Library | undefined = id && librariesByID[id]
  const quantity = library && library.quantity_ng ? library?.quantity_ng.toFixed(3) : undefined
  const concentration_nm = library && library.concentration_nm ? library?.concentration_nm.toFixed(3) : undefined
  const [sampleMetadata, setSampleMetadata] = useState<any[]>([])
  const [activeKey, setActiveKey] = useHashURL('overview')


  // Navigate to a sample when the sample's node is clicked in the lineage graph.
  const navigateToSample = useCallback((sample_id: FMSId) => {
    if (sample_id) {
      history(`/samples/${sample_id}#lineage`)
    }
  }, [history])

  // Navigate to a process measurement when the user clicks an edge
  // in the lineage graph.
  const navigateToProcess = useCallback((process_id: FMSId) => {
    if (process_id) {
      history(`/process-measurements/${process_id}`)
    }
  }, [history])

  useEffect(() => {
    if (id && !samplesByID[id])
      dispatch(getSample(id));
  }, [dispatch, id, samplesByID])

  useEffect(() => {
    if (isLoaded && sample && sample.versions === undefined)
      dispatch(listVersions(sample.id));
  }, [dispatch, isLoaded, sample, sample?.versions])

  useEffect(() => {    
    if (isLoaded && !isProcessesEmpty && sample?.process_measurements) {
      const promises: Promise<ProcessMeasurement>[] = sample.process_measurements.map((id) => {
        return new Promise((resolve) => {
          withProcessMeasurement(processMeasurementsByID, id.toString(), resolve);
        })
      })
      Promise.all(promises).then((pms) => setProcessMeasurements(pms))
    }
  }, [isLoaded, isProcessesEmpty, processMeasurementsByID, sample?.process_measurements])

  useEffect(() => {
    if (id && !librariesByID[id])
      dispatch(getLibrary(id))
  }, [dispatch, id, librariesByID])

  useEffect(() => {
    const biosampleId = sample?.biosample_id
    listSampleMetadata(token, { "biosample__id": biosampleId }).then(metadata => {
      setSampleMetadata(metadata)
    })
  }, [sample, token])

  useEffect(() => {
    if (sample?.individual)
      withIndividual(individualsByID, sample?.individual?.toString(), () => null)
  }, [individualsByID, sample?.individual])

  useEffect(() => {
    if (sample?.container)
      withContainer(containersByID, sample.container.toString(), () => null)
  }, [containersByID, sample?.container])

  useEffect(() => {
    if (sample?.coordinate)
      withCoordinate(coordinatesByID, sample.coordinate.toString(), () => null)
  }, [coordinatesByID, sample?.coordinate])

  const extracted_from = sample?.extracted_from !== undefined ? samplesByID[sample.extracted_from] : undefined

  useEffect(() => {
    if (extracted_from)
      withSample(samplesByID, extracted_from.toString(), () => null)
  }, [extracted_from, samplesByID])

  useEffect(() => {
    if (library?.index)
      withIndex(indicesByID, library?.index.toString(), () => null)
  }, [indicesByID, library?.index])

  return <>
    <AppPageHeader
      title={`Sample ${sample?.name || id}`}
      extra={isLoaded ?
        <Space>
          <div key="kind" style={{ display: "inline-block", verticalAlign: "top", marginTop: "4px" }}>
            <Tag>{sampleKind}</Tag>
          </div>
          <div key="depleted" style={depletedStyle}>
            <Tag color={sample?.depleted ? "red" : "green"}>{sample?.depleted ? "" : "NOT "}DEPLETED</Tag>
          </div>
          <EditButton url={`/samples/${id}/update`} />
        </Space>
        : []}
    />

    <PageContent loading={isFetching} style={pageStyle as unknown as undefined} tabs={true}>
      {error &&
        <ErrorMessage error={error} title={error?.name} description={''} />
      }
      <Tabs activeKey={activeKey} onChange={setActiveKey} size="large" type="card" className={(activeKey === 'lineage' ? 'lineage-tab-active' : '')}>
        <TabPane tab="Overview" key="overview" style={tabStyle}>
          <Descriptions bordered={true} size="small">
            <Descriptions.Item label="ID">{sample?.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{sample?.name}</Descriptions.Item>
            <Descriptions.Item label="Alias">{sample?.alias}</Descriptions.Item>
            <Descriptions.Item label="Sample Kind">{sampleKind}</Descriptions.Item>
            <Descriptions.Item label="Volume (µL)">{volume}</Descriptions.Item>
            <Descriptions.Item label="Concentration (ng/µL)">
              {sample?.concentration == null
                ? "—"
                : `${sample && sample.concentration.toFixed(3)}`}
            </Descriptions.Item>
            <Descriptions.Item label="Depleted"><Depletion depleted={sample?.depleted} /></Descriptions.Item>
          </Descriptions>
          <Descriptions bordered={true} size="small" style={{ marginTop: "24px" }}>
            <Descriptions.Item label="Individual Name">
              {sample?.individual &&
                <Link to={`/individuals/${sample.individual}`}>
                  { individualsByID[sample.individual]?.name ?? "Loading..." }
                </Link>
              }
            </Descriptions.Item>
            <Descriptions.Item label="Collection Site">{sample?.collection_site}</Descriptions.Item>
            <Descriptions.Item label="Tissue Source">{tissueSource}</Descriptions.Item>
            <Descriptions.Item label="Experimental Groups" span={2}>
              {experimentalGroups.map((g, i) =>
                <span key={g}>{g}{i === experimentalGroups.length - 1 ? "" : ", "}</span>)}
            </Descriptions.Item>
            <Descriptions.Item label="Reception/Creation Date">{sample?.creation_date}</Descriptions.Item>
            <Descriptions.Item label="Container Barcode">
              {sample?.container &&
                <Link to={`/containers/${sample.container}`}>
                  {containersByID[sample.container]?.barcode ?? "Loading..."}
                </Link>
              }
            </Descriptions.Item>
            <Descriptions.Item label="Coordinates">
              {sample?.coordinate ? coordinatesByID[sample.coordinate]?.name ?? "Loading..." : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="QC Flag">
              {!isNullish(flags.quantity) || !isNullish(flags.quality)
                ? <QCFlag flags={flags} />
                : null}
            </Descriptions.Item>
            <Descriptions.Item label="Comment" span={3}>{sample?.comment}</Descriptions.Item>
          </Descriptions>
          {extracted_from ? (
            <Descriptions bordered={true} size="small" title="Extraction Details" style={{ marginTop: "24px" }}>
              <Descriptions.Item label="Extracted From">
                <Link to={`/samples/${extracted_from.id}`}>
                  {extracted_from.name ?? "Loading..."}
                </Link>
                {" "}(
                {containersByID[extracted_from.container]?.barcode ?? "... "}
                {extracted_from.coordinate && ` at ${extracted_from.coordinate}`}
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
                  {library?.index && 
                  <Link to={`/indices/${library.index}`}>
                    {(indicesByID[library.index]?.name) || "Loading..."}
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

          <TrackingFieldsContent entity={sample} />
          <Title level={2} style={{ marginTop: '1rem' }}>Versions</Title>
          <Row>
            <Col sm={24} md={24}>
              <div ref={timelineRef as LegacyRef<HTMLDivElement>}>
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

        <TabPane tab={`Experiment (${experimentRunsIDs?.length})`} key="experiment" style={tabStyle}>
           <ExperimentRunsListSection experimentRunsIDs={experimentRunsIDs} />
        </TabPane>

        <TabPane tab={"Associated Projects"} key="associated-projects" style={tabStyle}>
          <SamplesAssociatedProjects sampleID={sample?.id} />
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
          <SampleDetailsLineage sample={sample ?? {}} 
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

export default SampleDetailsContent;
