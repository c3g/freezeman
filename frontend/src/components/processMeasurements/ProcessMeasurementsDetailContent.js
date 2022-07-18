import React, { useEffect } from "react";
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import {Link, useHistory, useParams} from "react-router-dom";
import {Descriptions, Typography, Tabs} from "antd";
const {TabPane} = Tabs;
const {Title} = Typography;

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import ProcessProperties from "../shared/ProcessProperties";
import TrackingFieldsContent from "../TrackingFieldsContent";
import {listPropertyValues} from "../../modules/experimentRuns/actions";
import { get as getProcess } from "../../modules/processes/actions";
import {withSample} from "../../utils/withItem";
import {get} from "../../modules/processMeasurements/actions";
import { isProcessPropertiesLoaded } from "../../utils/actionsWait";
import { listProperties as listProcessProperties } from "../../modules/processes/actions";

const mapStateToProps = state => ({
    processMeasurementsByID: state.processMeasurements.itemsByID,
    propertyValuesByID: state.propertyValues.itemsByID,
    protocolsByID: state.protocols.itemsByID,
    samplesByID: state.samples.itemsByID,
    usersByID: state.users.itemsByID,
    processesByID: state.processes.itemsByID,
});

const actionCreators = {get, listPropertyValues, listProcessProperties, getProcess};

const ProcessMeasurementsDetailContent = ({
  processMeasurementsByID,
  propertyValuesByID,
  protocolsByID,
  samplesByID,
  usersByID,
  get,
  listPropertyValues,
  processesByID,
  listProcessProperties,
  getProcess,
}) => {
    const history = useHistory();
    const {id} = useParams();
    const isLoaded = id in processMeasurementsByID;
    const processMeasurement = processMeasurementsByID[id] || {};
    const propertiesAreLoaded = processMeasurement?.properties?.every(property => property in propertyValuesByID)
    
    const processIsLoaded = processMeasurement?.process in processesByID;
    const process = processesByID[processMeasurement?.process] || {};

    useEffect(() => {
        if (!isLoaded)
            get(id);

        if (isLoaded && !propertiesAreLoaded) {
          listPropertyValues({ object_id__in: processMeasurement.id, content_type__model: "processmeasurement" });
        }

        if (!processIsLoaded) {
          getProcess(processMeasurement?.process);
        }
        if (processIsLoaded && !isProcessPropertiesLoaded(processesByID, propertyValuesByID, processMeasurement?.process)) {
          listProcessProperties(processMeasurement?.process);
        }
    })

    const isLoading = !isLoaded || processMeasurement.isFetching;
    const title =
        `Sample Process ${[id, processMeasurement && protocolsByID[processMeasurement.protocol]?.name ].filter(Boolean).join(' - ')}`;

    return <>
        <AppPageHeader title={title} onBack={() => history.push("/process-measurements/list")}/>
        <PageContent loading={isLoading}>
          <Tabs defaultActiveKey="1" size="large" type="card">
            <TabPane tab="Overview" key="1" style={{marginTop:8} }>
              <Descriptions bordered={true} size="small" column={4}>
                <Descriptions.Item label="Protocol" span={4}>{protocolsByID[processMeasurement.protocol]?.name}</Descriptions.Item>
                <Descriptions.Item label="Applied To Sample" span={2}>
                  <Link to={`/samples/${processMeasurement.source_sample}`}>
                    {withSample(samplesByID, processMeasurement.source_sample, sample => sample.name, "Loading...")}
                  </Link>
                </Descriptions.Item>
                <Descriptions.Item label="Sample Created (If Applicable)" span={2}>
                  {processMeasurement.child_sample &&
                    <Link to={`/samples/${processMeasurement.child_sample}`}>
                      {withSample(samplesByID, processMeasurement.child_sample, sample => sample.name, "Loading...")}
                    </Link>
                  }
                </Descriptions.Item>
                <Descriptions.Item label="Volume Used (µL)" span={2}>{processMeasurement.volume_used}</Descriptions.Item>
                <Descriptions.Item label="Date Executed" span={2}>{processMeasurement.execution_date}</Descriptions.Item>
                <Descriptions.Item label="Comment" span={4}>{processMeasurement.comment}</Descriptions.Item>
              </Descriptions>
              <TrackingFieldsContent entity={processMeasurement}/>
            </TabPane>
            <TabPane tab="Properties" key="2" style={{marginTop:8} }>
              <Title level={3}>Process Properties</Title>
              { process?.children_properties?.length > 0 &&
                  <>
                  <Title level={3} style={{marginTop: '20px'}}>Properties</Title>
                    <ProcessProperties
                        propertyIDs={process.children_properties}
                        protocolName={protocolsByID[process.protocol]?.name}
                    />
                  </>
              }
              {process?.children_processes?.map((id, i) => {
                  const process = processesByID[id]
                  return ( process &&
                      <>
                        <ProcessProperties
                            propertyIDs={process.children_properties}
                            protocolName={protocolsByID[process.protocol]?.name}
                        />
                      </>
                  )
                })
              }
              {processMeasurement?.properties?.length > 0 &&
                  <>
                  <Title level={3} style={{marginTop: '20px'}}>Application</Title>
                    <ProcessProperties
                        propertyIDs={processMeasurement.properties}
                        protocolName={protocolsByID[processMeasurement.protocol]?.name}
                    />
                  </>
              }
            </TabPane>
          </Tabs>
        </PageContent>
      </>;
};

export default connect(mapStateToProps, actionCreators)(ProcessMeasurementsDetailContent);
