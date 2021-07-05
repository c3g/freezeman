import React from "react";
import {connect} from "react-redux";
import {Link, useHistory, useParams} from "react-router-dom";
import {Descriptions, Space, Tag, Typography} from "antd";
const {Title} = Typography;

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import TrackingFieldsContent from "../TrackingFieldsContent";
import {get} from "../../modules/experimentRuns/actions";
import {withContainer} from "../../utils/withItem";

const mapStateToProps = state => ({
  containersByID: state.containers.itemsByID,
  experimentRunsByID: state.experimentRuns.itemsByID,
  experimentTypes: state.experimentTypes,
  instruments: state.instruments,
});

const actionCreators = {get};

const ExperimentRunsDetailContent = ({containersByID, experimentRunsByID, experimentTypes, instruments, get}) => {
  const history = useHistory();
  const {id} = useParams();

  const experimentRun = experimentRunsByID[id] || {};
  const isFetching = !experimentRunsByID[id] || experimentRun.isFetching;
  const isLoaded = experimentRunsByID[id];

  if (!isLoaded)
    get(id);

  return (
    <>
      <AppPageHeader
        title={`Experiment ${experimentRun.id || id}`}
        onBack={() => history.push("/experiment-runs/list")}
      />

      <PageContent loading={!isLoaded && isFetching}>
        <Title level={2}>Overview</Title>
        <Descriptions bordered={true} size="small">
          <Descriptions.Item label="Experiment Type" span={3}>
            <Tag>{experimentTypes.itemsByID[experimentRun.experiment_type]?.workflow}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Instrument" span={3}>
              {instruments.itemsByID[experimentRun.instrument]?.name}
          </Descriptions.Item>
          <Descriptions.Item label="Experiment Start Date" span={3}>
              {experimentRun.start_date}
          </Descriptions.Item>
          <Descriptions.Item label="Container Barcode">
              {experimentRun.container &&
                  <Link to={`/containers/${experimentRun.container}`}>
                      {withContainer(containersByID, experimentRun.container, container => container.barcode, "loading...")}
                  </Link>}
          </Descriptions.Item>
        </Descriptions>

        <TrackingFieldsContent entity={experimentRun}/>
      </PageContent>
    </>
  );
};

export default connect(mapStateToProps, actionCreators)(ExperimentRunsDetailContent);
