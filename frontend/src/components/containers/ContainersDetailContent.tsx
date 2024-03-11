import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Space, Descriptions, Typography, List, Tabs } from "antd";
const { Title } = Typography;
const { TabPane } = Tabs;

import AppPageHeader from "../AppPageHeader";
import ContainerHierarchy from "./ContainerHierarchy";
import PageContent from "../PageContent";
import EditButton from "../EditButton";
import TrackingFieldsContent from "../TrackingFieldsContent";
import { get, listParents } from "../../modules/containers/actions";
import { withContainer, withCoordinate } from "../../utils/withItem";
import ExperimentRunsListSection from "../shared/ExperimentRunsListSection";
import useHashURL from "../../hooks/useHashURL";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectContainerKindsByID, selectContainersByID, selectCoordinatesByID } from "../../selectors";
import { Container } from "../../models/frontend_models";
import { FMSId } from "../../models/fms_api_models";
import { WithContainerRenderComponent, WithCoordinateRenderComponent } from "../shared/WithItemRenderComponent";

const pageStyle = {
  padding: 0,
  overflow: "hidden",
}

const tabStyle = {
  padding: "0 24px 24px 24px",
  overflow: "auto",
  height: "100%",
}

const ContainersDetailContent = ({}) => {
  const history = useNavigate();
  const { id } = useParams();
  const [activeKey, setActiveKey] = useHashURL('overview')

  const dispatch = useAppDispatch()

  const containersByID = useAppSelector(selectContainersByID)
  const coordinatesByID = useAppSelector(selectCoordinatesByID)
  const containerKindsByID = useAppSelector(selectContainerKindsByID)

  const container: Container | undefined = id && containersByID[id];
  // const error = container.error;
  const isFetching = container ? container.isFetching : true;
  const isLoaded = container ? container.isLoaded : false;
  const experimentRunsIDs = isLoaded && container?.experiment_run ? [container.experiment_run] : []

  useEffect(() => {
    if (!isLoaded)
      dispatch(get(id));
  }, [isLoaded, dispatch, id])

  useEffect(() => {
    if (isLoaded && !container?.parents)
      dispatch(listParents(id));
  }, [isLoaded, container?.parents, dispatch, id])

  return (
    <>
      <AppPageHeader
        title={`Container ${container?.name || id}`}
        extra={
          !isLoaded ? null :
            <Space>
              <EditButton url={`/containers/${id}/update`} />
            </Space>
        } />
      <PageContent loading={!isLoaded && isFetching} style={pageStyle}>
        <Tabs activeKey={activeKey} onChange={setActiveKey} size="large" type="card">
          <TabPane tab="Overview" key="overview" style={tabStyle}>
            <Descriptions bordered={true} size="small">
              <Descriptions.Item label="ID" span={2}>{container?.id}</Descriptions.Item>
              <Descriptions.Item label="Name" span={2}>{container?.name}</Descriptions.Item>
              <Descriptions.Item label="Barcode">{container?.barcode}</Descriptions.Item>
              <Descriptions.Item label="Location" span={2}>
                {container?.location ?
                  <Link to={`/containers/${container.location}`}>
                    <WithContainerRenderComponent objectID={container.location} render={container => <>{container.barcode}</>} placeholder={"Loading..."} />
                  </Link>
                  : "—"}
                {container?.coordinate && ` at ${
                  <WithCoordinateRenderComponent objectID={container.coordinate} render={coordinate => <>{coordinate.name}</>}  placeholder={"Loading..."} />
                }`}
              </Descriptions.Item>
              <Descriptions.Item label="Kind">{container?.kind}</Descriptions.Item>
              <Descriptions.Item label="Comment" span={3}>{container?.comment}</Descriptions.Item>
            </Descriptions>

            <TrackingFieldsContent entity={container} />

            <Descriptions bordered={true} size="small" title="Content Details" style={{ marginTop: "24px" }}>
              <Descriptions.Item span={3}>
                <ContainerHierarchy key={id} container={isLoaded ? container : null} />
              </Descriptions.Item>
            </Descriptions>
          </TabPane>

          <TabPane tab={`Experiment (${experimentRunsIDs?.length})`} key="experiment" style={tabStyle}>
            {container &&
              (
                containerKindsByID[container.kind] && containerKindsByID[container.kind].is_run_container
                  ? <ExperimentRunsListSection experimentRunsIDs={experimentRunsIDs} />
                  : <div> Experiments are not run directly on containers of kind {container.kind} </div>
              )
            }

          </TabPane>
        </Tabs>


      </PageContent>
    </>
  );
};

export default ContainersDetailContent;
