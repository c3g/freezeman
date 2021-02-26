import React from "react";
import {connect} from "react-redux";
import {useHistory, useParams, Link} from "react-router-dom";
import {Space, Descriptions} from "antd";

import AppPageHeader from "../AppPageHeader";
import ContainerHierarchy from "./ContainerHierarchy";
import PageContent from "../PageContent";
import EditButton from "../EditButton";
import {get, listParents} from "../../modules/containers/actions";
import {withContainer, withSample} from "../../utils/withItem";

const mapStateToProps = state => ({
  containersByID: state.containers.itemsByID,
  samplesByID: state.samples.itemsByID,
});

const actionCreators = {get, listParents};

const ContainersDetailContent = ({containersByID, samplesByID, get, listParents}) => {
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
          <Descriptions.Item label="Content" span={3}>
            {(container.children && container.children.length > 0 )?
              <div><b>Container(s)</b></div>
              : ""}
            {container.children && container.children.map((childId, i) =>
              <>
                <Link key={childId} to={`/containers/${childId}`}>
                  {withContainer(containersByID, childId, container => container.name, <span>Loading…</span>)}
                </Link>
                {i !== container.children.length - 1 &&
                ', '
                }
              </>
            )
            }
            {(container.samples && container.samples.length > 0 )?
              <div><b>Sample(s)</b></div>
              : ""}

            {container.samples && container.samples.map((sampleId, i) =>
              <>
                <Link key={sampleId} to={`/samples/${sampleId}`}>
                  {withSample(samplesByID, sampleId, sample => sample.name, <span>Loading…</span>)}
                </Link>
                {i !== container.samples.length - 1 &&
                  ', '
                }
              </>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="" span={3}>
              <ContainerHierarchy key={id} container={isLoaded ? container : null} />
          </Descriptions.Item>
        </Descriptions>
      </PageContent>
    </>
  );
};

export default connect(mapStateToProps, actionCreators)(ContainersDetailContent);
