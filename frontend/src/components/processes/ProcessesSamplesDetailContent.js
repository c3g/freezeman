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
import {get} from "../../modules/processes/actions";

const mapStateToProps = state => ({
    processesByID: state.processes.itemsByID,
    protocolsByID: state.protocols.itemsByID,
    samplesByID: state.samples.itemsByID,
    usersByID: state.users.itemsByID,
});

const mapDispatchToProps = dispatch =>
    bindActionCreators({ get }, dispatch);

const ProcessesSamplesDetailContent = ({processesByID, protocolsByID, samplesByID, usersByID, get}) => {
    const history = useHistory();
    const {id} = useParams();
    const isLoaded = id in processesByID;
    const process = processesByID[id] || {};

    if (!isLoaded)
        get(id);

    const isLoading = !isLoaded || process.isFetching;
    const title =
        `Sample Process ${[id, process && protocolsByID[process.protocol]?.name ].filter(Boolean).join(' - ')}`;

    return <>
        <AppPageHeader title={title} onBack={() => history.push("/processes/list")}/>
        <PageContent loading={isLoading}>
            <Title level={2}>Overview</Title>
            <Descriptions bordered={true} size="small" column={4}>
                <Descriptions.Item label="Protocol" span={4}>{protocolsByID[process.protocol]?.name}</Descriptions.Item>
                <Descriptions.Item label="Applied To Sample" span={2}>
                  <Link to={`/samples/${process.source_sample}`}>
                    {withSample(samplesByID, process.source_sample, sample => sample.name, "Loading...")}
                  </Link>
                </Descriptions.Item>
                <Descriptions.Item label="Sample Created (If Applicable)" span={2}>
                  {process.child_sample &&
                    <Link to={`/samples/${process.child_sample}`}>
                      {withSample(samplesByID, process.child_sample, sample => sample.name, "Loading...")}
                    </Link>
                  }
                </Descriptions.Item>
                <Descriptions.Item label="Volume Used (µL)" span={2}>{process.volume_used}</Descriptions.Item>
                <Descriptions.Item label="Date Executed" span={2}>{process.execution_date}</Descriptions.Item>
                <Descriptions.Item label="Comment" span={4}>{process.comment}</Descriptions.Item>  
            </Descriptions>
            <TrackingFieldsContent entity={process}/>
        </PageContent>
    </>;
};

export default connect(mapStateToProps, mapDispatchToProps)(ProcessesSamplesDetailContent);
