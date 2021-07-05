import React from "react";
import {connect} from "react-redux";
import {Link, useHistory, useParams} from "react-router-dom";
import {Descriptions, Space, Tag, Typography, Collapse} from "antd";
const {Panel} = Collapse;
const {Title} = Typography;

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import TrackingFieldsContent from "../TrackingFieldsContent";
import {get, listProcesses, listPropertyValues} from "../../modules/experimentRuns/actions";
import {withContainer} from "../../utils/withItem";

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

  if (isLoaded && !processesByID[experimentRun.process]) {
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

        <Title level={3} style={{marginTop: "30px"}}>Experiment Protocols</Title>
        {isLoaded && experimentRun.children_processes &&
          <Collapse>
            {experimentRun.children_processes.map((id, i) => {
              const process = processesByID[id]
              return ( process &&
                  <Panel header={protocolsByID[process.protocol]?.name} key={`panel-${i}`}>
                    {process.children_properties.map((id, i) => {
                      const propertyValue = propertyValuesByID[id]
                      return ( propertyValue &&
                              <div>
                                <b>{propertyValue.property_name}</b>: {propertyValue.value}
                              </div>
                      )
                    })}

                  </Panel>
              )
            })
            }
          </Collapse>
        }

      </PageContent>
    </>
  );
};

export default connect(mapStateToProps, actionCreators)(ExperimentRunsDetailContent);
