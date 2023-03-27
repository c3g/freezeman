import React from "react";
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

const mapStateToProps = state => ({
  containersByID: state.containers.itemsByID,
  coordinatesByID: state.coordinates.itemsByID,
  containerKindsByID: state.containerKinds.itemsByID,
});

const actionCreators = { get, listParents };

const ContainersDetailContent = ({
  containersByID,
  coordinatesByID,
  containerKindsByID,
  get,
  listParents
}) => {
  const history = useNavigate();
  const { id } = useParams();
  const [activeKey, setActiveKey] = useHashURL('overview')

  const container = containersByID[id] || {};
  // const error = container.error;
  const isFetching = !containersByID[id] || container.isFetching;
  const isLoaded = containersByID[id] && container.isLoaded;
  let experimentRunsIDs = []

  if (!isLoaded)
    get(id);

  if (isLoaded && !container.parents)
    listParents(id);

  if (isLoaded)
    if (container.experiment_run)
      experimentRunsIDs.push(container.experiment_run)


  return (
    <>
      <AppPageHeader
        title={`Container ${container.name || id}`}
        extra={
          !isLoaded ? null :
            <Space>
              <EditButton url={`/containers/${id}/update`} />
            </Space>
        } />
      <PageContent loading={!isLoaded && isFetching} style={pageStyle}>
        <Tabs activeKey={activeKey} onChange={setActiveKey} size="large" type="card" style={tabsStyle}>
          <TabPane tab="Overview" key="overview" style={tabStyle}>
            <Descriptions bordered={true} size="small">
              <Descriptions.Item label="ID" span={2}>{container.id}</Descriptions.Item>
              <Descriptions.Item label="Name" span={2}>{container.name}</Descriptions.Item>
              <Descriptions.Item label="Barcode">{container.barcode}</Descriptions.Item>
              <Descriptions.Item label="Location" span={2}>
                {container.location ?
                  <Link to={`/containers/${container.location}`}>
                    {withContainer(containersByID, container.location, container => container.barcode, "Loading...")}
                  </Link>
                  : "—"}
                {container.coordinate && ` at ${withCoordinate(coordinatesByID, container.coordinate, coordinate => coordinate.name, "Loading...")}`}
              </Descriptions.Item>
              <Descriptions.Item label="Kind">{container.kind}</Descriptions.Item>
              <Descriptions.Item label="Comment" span={3}>{container.comment}</Descriptions.Item>
            </Descriptions>

            <TrackingFieldsContent entity={container} />

            <Descriptions bordered={true} size="small" title="Content Details" style={{ marginTop: "24px" }}>
              <Descriptions.Item span={3}>
                <ContainerHierarchy key={id} container={isLoaded ? container : null} />
              </Descriptions.Item>
            </Descriptions>
          </TabPane>

          <TabPane tab={`Experiment (${experimentRunsIDs?.length})`} key="experiment" style={tabStyle}>

            {containerKindsByID[container.kind] && containerKindsByID[container.kind].is_run_container ?
              <ExperimentRunsListSection experimentRunsIDs={experimentRunsIDs} />
              :
              <div> Experiments are not run directly on containers of kind {container.kind} </div>
            }

          </TabPane>
        </Tabs>


      </PageContent>
    </>
  );
};

export default connect(mapStateToProps, actionCreators)(ContainersDetailContent);
