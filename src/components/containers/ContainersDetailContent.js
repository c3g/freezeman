import React from "react";
import {connect} from "react-redux";
import {Link, useHistory, useParams} from "react-router-dom";

import {Space, Button, Descriptions, Tag} from "antd";
import "antd/es/button/style/css";
import "antd/es/descriptions/style/css";
import "antd/es/tag/style/css";
import "antd/es/space/style/css";

import {EditOutlined, BarcodeOutlined} from "@ant-design/icons";

import AppPageHeader from "../AppPageHeader";
import ContainerHierarchy from "./ContainerHierarchy";
import PageContent from "../PageContent";
import {get, listParents} from "../../modules/containers/actions";

const mapStateToProps = state => ({
  containersByID: state.containers.itemsByID,
});

const actionCreators = {get, listParents};

const ContainersDetailContent = ({containersByID, get, listParents}) => {
  const history = useHistory();
  const {id} = useParams();

  const container = containersByID[id] || {};
  // const error = container.error;
  const isFetching = !containersByID[id] || container.isFetching;
  const isLoaded = containersByID[id] && container.isLoaded;

  if (!isLoaded)
    get(id);

  if (isLoaded && !container.parents)
    listParents(id);

  return (
    <>
      <AppPageHeader title={container.name || `Container ${id}`} onBack={history.goBack} extra={
        !isLoaded ? null :
        <Space>
          <div key="kind">
              <Tag>{container.kind}</Tag>
          </div>
          <div key="barcode">
              <BarcodeOutlined /> {container.barcode}
          </div>
          <Button icon={<EditOutlined />} onClick={() => history.push(`/containers/${id}/update`)}>
            Edit
          </Button>
        </Space>
      } />
      <PageContent loading={!isLoaded && isFetching}>
        <Descriptions bordered={true} size="small">
          <Descriptions.Item label="Name" span={2}>{container.name}</Descriptions.Item>
          <Descriptions.Item label="Barcode">{container.barcode}</Descriptions.Item>
          <Descriptions.Item label="Location" span={2}>
              {container.location || "—"}{container.coordinates ? `at ${container.coordinates}` : ""}
          </Descriptions.Item>
          <Descriptions.Item label="Kind">{container.kind}</Descriptions.Item>
          <Descriptions.Item label="Comment" span={3}>{container.comment}</Descriptions.Item>
          <Descriptions.Item label="" span={3}>
              <ContainerHierarchy key={id} container={isLoaded ? container : null} />
          </Descriptions.Item>
        </Descriptions>
      </PageContent>
    </>
  );
};

export default connect(mapStateToProps, actionCreators)(ContainersDetailContent);
