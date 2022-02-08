import React from "react";
import {connect} from "react-redux";
import {useHistory, useParams} from "react-router-dom";
import {Descriptions, Typography} from "antd";
const {Title} = Typography;

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import ProcessProperties from "../shared/ProcessProperties";
import TrackingFieldsContent from "../TrackingFieldsContent";
import {listProcesses, listPropertyValues} from "../../modules/experimentRuns/actions";

const mapStateToProps = state => ({
    processesByID: state.processes.itemsByID,
    propertyValuesByID: state.propertyValues.itemsByID,
    protocolsByID: state.protocols.itemsByID,
});

const actionCreators = {listProcesses, listPropertyValues};

const ProcessDetailContent = ({
  processesByID,
  propertyValuesByID,
  protocolsByID,
  listPropertyValues,
  listProcesses
}) => {
    const history = useHistory();
    const {id} = useParams();
    const isLoaded = id in processesByID;
    const process = processesByID[id] || {};
    const propertiesAreLoaded = process?.children_properties?.every(property => property in propertyValuesByID)

    if (!isLoaded) {
      listProcesses({id__in: id});
    }

    if (isLoaded && !propertiesAreLoaded) {
      listPropertyValues({ object_id__in: id, content_type__model: "process" });
    }

    const isLoading = !isLoaded || process.isFetching;
    const title =
        `Process ${[id, process && protocolsByID[process.protocol]?.name ].filter(Boolean).join(' - ')}`;

    return <>
        <AppPageHeader title={title} onBack={() => history.push("/process-measurements/list")}/>
        <PageContent loading={isLoading}>
            <Title level={2}>Overview</Title>
            <Descriptions bordered={true} size="small" column={4}>
                <Descriptions.Item label="Protocol" span={4}>{protocolsByID[process.protocol]?.name}</Descriptions.Item>
                {process.parent_process &&
                  <Descriptions.Item label="Parent Process" span={4}>{process.parent_process}</Descriptions.Item>
                }
                <Descriptions.Item label="Comment" span={4}>{process.comment}</Descriptions.Item>
            </Descriptions>
            { process?.children_properties?.length > 0 &&
                <>
                <Title level={3} style={{marginTop: '20px'}}>Properties</Title>
                  <ProcessProperties
                      propertyIDs={process.children_properties}
                      protocolName={protocolsByID[process.protocol]?.name}
                  />
                </>
             }
            <TrackingFieldsContent entity={process}/>
        </PageContent>
    </>;
};

export default connect(mapStateToProps, actionCreators)(ProcessDetailContent);
