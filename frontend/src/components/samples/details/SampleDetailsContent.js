import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  Descriptions,
  Space,
  Tabs,
  Tag,
  Typography
} from "antd";

import AppPageHeader from "../../AppPageHeader";
import PageContent from "../../PageContent";
import ErrorMessage from "../../ErrorMessage";
import EditButton from "../../EditButton";
import SamplesAssociatedProjects from "../SamplesAssociatedProjects";
import SampleDetailsProcessMeasurements from "./SampleDetailsProcessMeasurements";
import SampleDetailsLineage from "./SampleDetailsLineage";
import SampleDetailsPool from './SampleDetailsPool'
import { get as getSample, listVersions } from "../../../modules/samples/actions";
import { get as getLibrary } from "../../../modules/libraries/actions";
import api, { withToken } from "../../../utils/api";
import ExperimentRunsListSection from "../../shared/ExperimentRunsListSection";
import useHashURL from "../../../hooks/useHashURL";
import { fetchProcessMeasurements } from "../../../modules/cache/cache";
import { useAppDispatch, useAppSelector } from "../../../hooks";
import { selectAuthTokenAccess, selectContainersByID, selectLibrariesByID, selectSampleKindsByID, selectSamplesByID, selectUsersByID } from "../../../selectors";
import SampleDetailsContentOverview from "./SampleDetailsContentOverview";

const { Title } = Typography;


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
  const token = useAppSelector(selectAuthTokenAccess)

  const history = useNavigate();
  const { id } = useParams();


  const sample = useMemo(() => samplesByID[id] || {}, [id, samplesByID])
  const error = sample.error?.name !== 'APIError' ? sample.error : undefined;
  const isLoaded = samplesByID[id] && !sample.isFetching && !sample.didFail;
  const isFetching = !samplesByID[id] || sample.isFetching;
  const sampleKind = sample ? sampleKindsByID[sample.sample_kind]?.name ?? (sample.is_pool ? "Pool" : "") : ""
  const container = sample ? containersByID[sample.container] : undefined
  const [processMeasurements, setProcessMeasurements] = useState([])
  const experimentRunsIDs = useMemo(() => isLoaded && container?.experiment_run ? [container.experiment_run] : [], [container?.experiment_run, isLoaded])
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
    if (isLoaded) {
      fetchProcessMeasurements(sample.process_measurements).then((processMeasurements) => {
        setProcessMeasurements(processMeasurements)
      })
    }
  }, [isLoaded, sample.process_measurements])

  useEffect(() => {
    if (!librariesByID[id])
      dispatch(getLibrary(id))
  }, [dispatch, id, librariesByID])

  useEffect(() => {
    const biosampleId = sample?.biosample_id
    listSampleMetadata(token, { "biosample__id": biosampleId }).then(metadata => {
      setSampleMetadata(metadata)
    })
  }, [sample, token])

  const tabs = useMemo(() => {
    /**
     * @type {NonNullable<import("antd").TabsProps['items']>>}
     */
    const tabs = [
      {
        key: 'overview',
        label: 'Overview',
        style: tabStyle,
        children: id && <SampleDetailsContentOverview sampleID={Number(id)} />
      },
      {
        key: 'processes',
        label: `Processes (${processMeasurements.length})`,
        style: tabStyle,
        children: <SampleDetailsProcessMeasurements processMeasurements={processMeasurements} />
      },
      {
        key: 'experiment',
        label: `Experiment (${experimentRunsIDs.length})`,
        style: tabStyle,
        children: <ExperimentRunsListSection experimentRunsIDs={experimentRunsIDs} />
      },
      {
        key: 'associated-projects',
        label: 'Associated Projects',
        style: tabStyle,
        children: <SamplesAssociatedProjects sampleID={sample.id} />
      },
      {
        key: 'metadata',
        label: 'Metadata',
        style: tabStyle,
        children: <>
        <Title level={5} style={{ marginTop: '1rem'}}> Metadata </Title>
          <Descriptions bordered={true} size="small">
            {
              sampleMetadata.map((metadata, index) => {
                return <Descriptions.Item key={index} label={metadata?.name}>{metadata?.value} </Descriptions.Item>
              })
            }

          </Descriptions>
        </>
      },
      {
        key: 'lineage',
        label: 'Lineage',
        style: lineageStyle,
        children: <SampleDetailsLineage sample={sample} 
            handleSampleClick={navigateToSample}
            handleProcessClick={navigateToProcess}
          />
      },
      {
        key: 'pool',
        label: 'Pool',
        style: tabStyle,
        children: <SampleDetailsPool sample={sample}></SampleDetailsPool>
      }
    ]
    return tabs
  }, [experimentRunsIDs, id, navigateToProcess, navigateToSample, processMeasurements, sample, sampleMetadata])

  return <>
    <AppPageHeader
      title={`Sample ${sample.name || id}`}
      extra={isLoaded ?
        <Space>
          <div key="kind" style={{ display: "inline-block", verticalAlign: "top", marginTop: "4px" }}>
            <Tag variant="outlined">{sampleKind}</Tag>
          </div>
          <div key="depleted" style={depletedStyle}>
            <Tag variant="outlined" color={sample.depleted ? "red" : "green"}>{sample.depleted ? "" : "NOT "}DEPLETED</Tag>
          </div>
          <EditButton url={`/samples/${id}/update`} />
        </Space>
        : []}
    />

    <PageContent loading={isFetching} style={pageStyle} tabs={true}>
      {error &&
        <ErrorMessage error={error} />
      }
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        size="large"
        type="card"
        className={(activeKey === 'lineage' ? 'lineage-tab-active' : '')}
        items={tabs}
      />

    </PageContent>
  </>;
};

export default SampleDetailsContent
