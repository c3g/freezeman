import React from "react";
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import {Link, useHistory, useParams} from "react-router-dom";
import {Descriptions, Typography} from "antd";
const {Title} = Typography;

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import TrackingFieldsContent from "../TrackingFieldsContent";
import {withSample} from "../../utils/withItem";
import {get} from "../../modules/processMeasurements/actions";

const mapStateToProps = state => ({
    processMeasurementsByID: state.processMeasurements.itemsByID,
    protocolsByID: state.protocols.itemsByID,
    samplesByID: state.samples.itemsByID,
    usersByID: state.users.itemsByID,
});

const mapDispatchToProps = dispatch =>
    bindActionCreators({ get }, dispatch);

const ProcessMeasurementsDetailContent = ({processMeasurementsByID, protocolsByID, samplesByID, usersByID, get}) => {
    const history = useHistory();
    const {id} = useParams();
    const isLoaded = id in processMeasurementsByID;
    const processMeasurement = processMeasurementsByID[id] || {};

    if (!isLoaded)
        get(id);

    const isLoading = !isLoaded || processMeasurement.isFetching;
    const title =
        `Sample Process ${[id, processMeasurement && protocolsByID[processMeasurement.protocol]?.name ].filter(Boolean).join(' - ')}`;

    return <>
        <AppPageHeader title={title} onBack={() => history.push("/process-measurements/list")}/>
        <PageContent loading={isLoading}>
            <Title level={2}>Overview</Title>
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
        </PageContent>
    </>;
};

export default connect(mapStateToProps, mapDispatchToProps)(ProcessMeasurementsDetailContent);
