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
import {get} from "../../modules/processesSamples/actions";

const mapStateToProps = state => ({
    processesSamplesByID: state.processesSamples.itemsByID,
    protocolsByID: state.protocols.itemsByID,
    samplesByID: state.samples.itemsByID,
    usersByID: state.users.itemsByID,
});

const mapDispatchToProps = dispatch =>
    bindActionCreators({ get }, dispatch);

const ProcessesSamplesDetailContent = ({processesSamplesByID, protocolsByID, samplesByID, get}) => {
    const history = useHistory();
    const {id} = useParams();
    const isLoaded = id in processesSamplesByID;
    const processSample = processesSamplesByID[id] || {};

    if (!isLoaded)
        get(id);

    const isLoading = !isLoaded || processSample.isFetching;
    const title =
        `Sample Process ${[id, processSample && protocolsByID[processSample.protocol]?.name ].filter(Boolean).join(' - ')}`;

    return <>
        <AppPageHeader title={title} onBack={() => history.push("/processesSamples/list")}/>
        <PageContent loading={isLoading}>
            <Title level={2}>Overview</Title>
            <Descriptions bordered={true} size="small" column={4}>
                <Descriptions.Item label="Protocol" span={4}>{protocolsByID[processSample.protocol]?.name}</Descriptions.Item>
                <Descriptions.Item label="Applied To Sample" span={2}>
                  <Link to={`/samples/${processSample.source_sample}`}>
                    {withSample(samplesByID, processSample.source_sample, sample => sample.name, "Loading...")}
                  </Link>
                </Descriptions.Item>
                <Descriptions.Item label="Sample Created (If Applicable)" span={2}>
                  {processSample.child_sample &&
                    <Link to={`/samples/${processSample.child_sample}`}>
                      {withSample(samplesByID, processSample.child_sample, sample => sample.name, "Loading...")}
                    </Link>
                  }
                </Descriptions.Item>
                <Descriptions.Item label="Volume Used (µL)" span={2}>{processSample.volume_used}</Descriptions.Item>
                <Descriptions.Item label="Date Executed" span={2}>{processSample.execution_date}</Descriptions.Item>
                <Descriptions.Item label="Comment" span={4}>{processSample.comment}</Descriptions.Item>
            </Descriptions>
            <TrackingFieldsContent entity={processSample}/>
        </PageContent>
    </>;
};

export default connect(mapStateToProps, mapDispatchToProps)(ProcessesSamplesDetailContent);
