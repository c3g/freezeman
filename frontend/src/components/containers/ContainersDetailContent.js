import React from "react";
import {connect} from "react-redux";
import {useHistory, useParams, Link} from "react-router-dom";
import {Space, Descriptions, Typography, List} from "antd";
const {Title} = Typography;

import AppPageHeader from "../AppPageHeader";
import ContainerHierarchy from "./ContainerHierarchy";
import PageContent from "../PageContent";
import EditButton from "../EditButton";
import TrackingFieldsContent from "../TrackingFieldsContent";
import {get, listParents} from "../../modules/containers/actions";
import {list as listExperimentRuns} from "../../modules/experimentRuns/actions"
import {withContainer} from "../../utils/withItem";

const mapStateToProps = state => ({
  containersByID: state.containers.itemsByID,
  experimentRunsByID: state.experimentRuns.itemsByID,
  experimentTypesByID: state.experimentTypes.itemsByID,
  instrumentsByID: state.instruments.itemsByID,
});

const actionCreators = {get, listParents};

const ContainersDetailContent = ({
  containersByID,
  experimentRunsByID,
  experimentTypesByID,
  instrumentsByID,
  get,
  listParents
}) => {
  const history = useHistory();
  const {id} = useParams();

  const container = containersByID[id] || {};
  // const error = container.error;
  const isFetching = !containersByID[id] || container.isFetching;
  const isLoaded = containersByID[id] && container.isLoaded;

  const hasExperimentRuns = isLoaded && container.experiment_runs.length
  const hasNoExperimentRuns = isLoaded && !container.experiment_runs.length
  const experimentRunsLoaded = hasExperimentRuns && experimentRunsByID[container.experiment_runs[0]]
  const experimentRunsReady = hasNoExperimentRuns || experimentRunsLoaded
  let experimentRuns = []

  if (!isLoaded)
    get(id);

  if (isLoaded && !container.parents)
    listParents(id);

  if (hasExperimentRuns && !experimentRunsLoaded)
    listExperimentRuns({container__id__in: container.experiment_runs.join()})

  if (experimentRunsLoaded)
    experimentRuns = container.experiment_runs?.map(erID => experimentRunsByID[erID])


  return (
    <>
      <AppPageHeader
        title={`Container ${container.name || id}`}
        onBack={() => history.push("/containers/list")}
        extra={
        !isLoaded ? null :
          <Space>
            <EditButton url={`/containers/${id}/update`} />
          </Space>
      } />
      <PageContent loading={!isLoaded && isFetching}>
        <Title level={2}>Overview</Title>
        <Descriptions bordered={true} size="small">
          <Descriptions.Item label="Name" span={2}>{container.name}</Descriptions.Item>
          <Descriptions.Item label="Barcode">{container.barcode}</Descriptions.Item>
          <Descriptions.Item label="Location" span={2}>
            {container.location ?
              <Link to={`/containers/${container.location}`}>
                {withContainer(containersByID, container.location, container => container.barcode, "Loading...")}
              </Link>
              : "—"}
            {container.coordinates && ` at ${container.coordinates}`}
          </Descriptions.Item>
          <Descriptions.Item label="Kind">{container.kind}</Descriptions.Item>
          <Descriptions.Item label="Comment" span={3}>{container.comment}</Descriptions.Item>
        </Descriptions>

        <TrackingFieldsContent entity={container}/>

        <Title level={4} style={{marginTop: "24px"}}>Experiments</Title>
        <List
          bordered
          dataSource={experimentRuns}
          loading={!experimentRunsReady}
          renderItem={experimentRun => (
            <List.Item>
              {`${experimentRun.start_date}  -  `}
              <Link to={`/experiment-runs/${experimentRun.id}`}>
                 {`[Experiment #${experimentRun.id}]  `}
              </Link>
              {experimentTypesByID[experimentRun.experiment_type]?.workflow}
              {` (${instrumentsByID[experimentRun.instrument]?.name})`}

            </List.Item>
          )}
        />

        <Descriptions bordered={true} size="small" title="Content Details" style={{marginTop: "24px"}}>
          <Descriptions.Item span={3}>
            <ContainerHierarchy key={id} container={isLoaded ? container : null} />
          </Descriptions.Item>
        </Descriptions>
      </PageContent>
    </>
  );
};

export default connect(mapStateToProps, actionCreators)(ContainersDetailContent);
