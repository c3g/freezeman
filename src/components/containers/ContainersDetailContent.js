import React from "react";
import {connect} from "react-redux";
import {useHistory, useParams} from "react-router-dom";

import {Descriptions, Tag} from "antd";
import "antd/es/descriptions/style/css";
import "antd/es/tag/style/css";

import {BarcodeOutlined} from "@ant-design/icons";

import AppPageHeader from "../AppPageHeader";
import ContainerHierarchy from "./ContainerHierarchy";
import PageContent from "../PageContent";
import {get, listParents} from "../../modules/containers/actions";

const extraStyle = {
  display: "flex",
  flexDirection: "row",
  height: "100%",
  alignItems: "center",
};

const mapStateToProps = state => ({
  containersByID: state.containers.itemsByID,
});

const actionCreators = {get, listParents};

const ContainersDetailContent = ({containersByID, get, listParents}) => {
  const history = useHistory();
  const {barcode: id} = useParams();

  const container = containersByID[id] || {};
  const error = container.error;
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
        <div style={extraStyle}>
          <div key="kind">
              <Tag>{container.kind}</Tag>
          </div>
          <div key="barcode">
              <BarcodeOutlined /> {container.id}
          </div>
        </div>
      } />
      <PageContent loading={!isLoaded && isFetching}>
        <Descriptions bordered={true} size="small">
          <Descriptions.Item label="Name" span={2}>{container.name}</Descriptions.Item>
          <Descriptions.Item label="Barcode">{container.id}</Descriptions.Item>
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
