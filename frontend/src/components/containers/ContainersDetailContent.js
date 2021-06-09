import React from "react";
import {connect} from "react-redux";
import {useHistory, useParams, Link} from "react-router-dom";
import {Space, Descriptions, Typography} from "antd";
const {Title} = Typography;

import AppPageHeader from "../AppPageHeader";
import ContainerHierarchy from "./ContainerHierarchy";
import ContainerTree from "./ContainerTree";
import PageContent from "../PageContent";
import EditButton from "../EditButton";
import TrackingFieldsContent from "../TrackingFieldsContent";
import {get, listParents, listChildrenRecursively, listSamplesRecursively} from "../../modules/containers/actions";
import {withContainer, withSample} from "../../utils/withItem";

const mapStateToProps = state => ({
  containersByID: state.containers.itemsByID,
  samplesByID: state.samples.itemsByID,
  usersByID: state.users.itemsByID,
});

const actionCreators = {get, listParents};

const ContainersDetailContent = ({containersByID, samplesByID, usersByID, get, listParents}) => {
  const history = useHistory();
  const {id} = useParams();

  const container = containersByID[id] || {};
  // const error = container.error;
  const isFetching = !containersByID[id] || container.isFetching;
  const isLoaded = containersByID[id] && container.isLoaded;

  if (!isLoaded)
    get(id);

  if (isLoaded && !container.parents) {
    listParents(id);
  }

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
