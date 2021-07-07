import React from "react";
import {connect} from "react-redux";
import {Link, useHistory, useParams} from "react-router-dom";
import {Descriptions, Space, Tag, Typography, Collapse, Tabs} from "antd";
const {Panel} = Collapse;
const {Title} = Typography;
const { TabPane } = Tabs;

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import TrackingFieldsContent from "../TrackingFieldsContent";
import {get, listProcesses, listPropertyValues} from "../../modules/experimentRuns/actions";
import {withContainer} from "../../utils/withItem";
import ExperimentRunsProperties from "./ExperimentRunsProperties";
import ExperimentRunsSamples from "./ExperimentRunsSamples";

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
  experimentRunsByID: state.experimentRuns.itemsByID,
  experimentTypes: state.experimentTypes,
  instruments: state.instruments,
  processesByID: state.processes.itemsByID,
  propertyValuesByID: state.propertyValues.itemsByID,
  protocolsByID: state.protocols.itemsByID,
});

const actionCreators = {get, listProcesses, listPropertyValues};

const ExperimentRunsDetailContent = ({
  containersByID,
  experimentRunsByID,
  experimentTypes,
  instruments,
  processesByID,
  propertyValuesByID,
  protocolsByID,
  get,
  listProcesses,
  listPropertyValues,
}) => {
  const history = useHistory();
  const {id} = useParams();

  const experimentRun = experimentRunsByID[id] || {};
  const isFetching = !experimentRunsByID[id] || experimentRun.isFetching;
  const isLoaded = experimentRunsByID[id];
  let processIDS = []


  if (!isLoaded) {
    get(id);
  }

  if (isLoaded && experimentRun.children_processes?.length > 0 && !processesByID[experimentRun.children_processes[0]]) {
    processIDS = [experimentRun.process].concat(experimentRun.children_processes)
    // Need to be queried as a string, not as an array in order to work with DRF filters
    const processIDSAsStr = processIDS.join()
    listProcesses({id__in: processIDSAsStr});
    listPropertyValues({object_id__in: processesByID, content_type__model: "process"})
  }


  return (
    <>
      <AppPageHeader
        title={`Experiment ${experimentRun.id || id}`}
        onBack={() => history.push("/experiment-runs/list")}
      />

      <PageContent loading={!isLoaded && isFetching} style={pageStyle} tabs={true}>
        <Tabs defaultActiveKey="1" size="large" type="card" style={tabsStyle}>
          <TabPane tab="Overview" key="1" style={tabStyle}>
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
          </TabPane>

          <TabPane tab="Steps" key="2" style={tabStyle}>
            {isLoaded && experimentRun.children_processes &&
              <>
                {experimentRun.children_processes.map((id, i) => {
                  const process = processesByID[id]
                  return ( process &&
                      <>
                        <ExperimentRunsProperties
                            propertyIDs={process.children_properties}
                            protocolName={protocolsByID[process.protocol]?.name}
                        />
                      </>
                  )
                })
                }
              </>
            }
          </TabPane>

          <TabPane tab="Samples" key="3" style={tabStyle}>
              <ExperimentRunsSamples containerID={isLoaded ? experimentRun.container : undefined}/>
          </TabPane>

        </Tabs>

      </PageContent>
    </>
  );
};

export default connect(mapStateToProps, actionCreators)(ExperimentRunsDetailContent);
