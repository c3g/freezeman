import { useDispatch, useSelector } from "react-redux"
import React, { useEffect } from "react";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Descriptions, Typography, Tabs } from "antd";
const { TabPane } = Tabs;
const { Title } = Typography;

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import ProcessProperties from "../shared/ProcessProperties";
import TrackingFieldsContent from "../TrackingFieldsContent";
import { listPropertyValues } from "../../modules/experimentRuns/actions";
import { withSample } from "../../utils/withItem";
import { get } from "../../modules/processMeasurements/actions";
import AllProcessProperties from "../shared/AllProcessProperties";





const ProcessMeasurementsDetailContent = ({  }) => {
  const processMeasurementsByID = useSelector((state) => state.processMeasurements.itemsByID)
  const propertyValuesByID = useSelector((state) => state.propertyValues.itemsByID)
  const protocolsByID = useSelector((state) => state.protocols.itemsByID)
  const samplesByID = useSelector((state) => state.samples.itemsByID)
  const usersByID = useSelector((state) => state.users.itemsByID)
  const dispatch = useDispatch()
  const dispatchGet = useCallback((...args) => get(...args), [dispatch])
  const dispatchListPropertyValues = useCallback((...args) => listPropertyValues(...args), [dispatch])

  const history = useNavigate();
  const { id } = useParams();
  const isLoaded = id in processMeasurementsByID;
  const processMeasurement = processMeasurementsByID[id] || {};
  const propertiesAreLoaded = processMeasurement?.properties?.every(property => property in propertyValuesByID)

  useEffect(() => {
    (async () => {
      if (!isLoaded)
        await dispatchGet(id);

      if (!propertiesAreLoaded) {
        await dispatchListPropertyValues({ object_id__in: processMeasurement.id, content_type__model: "processmeasurement" });
      }
    })()
  }, [processMeasurementsByID, propertyValuesByID, id])

  const isLoading = !isLoaded || processMeasurement.isFetching;
  const title =
    `Sample Process ${[id, processMeasurement && protocolsByID[processMeasurement.protocol]?.name].filter(Boolean).join(' - ')}`;

  return <>
    <AppPageHeader title={title} />
    <PageContent loading={isLoading}>
      <Tabs defaultActiveKey="1" size="large" type="card">
        <TabPane tab="Overview" key="1" style={{ marginTop: 8 }}>
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
          <TrackingFieldsContent entity={processMeasurement} />
        </TabPane>
        <TabPane tab="Properties" key="2" style={{ marginTop: 8 }}>
          <Title level={3} style={{ marginTop: '20px' }}>Shared Process Properties</Title>
          {processMeasurement?.process && <AllProcessProperties id={processMeasurement?.process} />}
          <Title level={3} style={{ marginTop: '20px' }}>Sample Process Properties</Title>
          {processMeasurement?.properties?.length === 0 && <>No sample specific properties associated with the protocol.</>}
          {processMeasurement?.properties?.length > 0 &&
            <>
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

export default ProcessMeasurementsDetailContent;
