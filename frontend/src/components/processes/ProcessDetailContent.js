import React from "react";
import {connect} from "react-redux";
import {Link, useHistory, useParams} from "react-router-dom";
import {Button, Descriptions, Typography, Tabs, notification} from "antd";
const {TabPane} = Tabs;
const {Title} = Typography;

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import ProcessProperties from "../shared/ProcessProperties";
import TrackingFieldsContent from "../TrackingFieldsContent";
import {listProcesses, listPropertyValues} from "../../modules/experimentRuns/actions";
import {downloadFromFile} from "../../utils/download";
import api, {withToken}  from "../../utils/api"


const mapStateToProps = state => ({
    token: state.auth.tokens.access,
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
  listProcesses,
  token
}) => {
    const history = useHistory();
    const {id} = useParams();
    const isLoaded = id in processesByID;
    const process = processesByID[id] || {};
    const childrenProcessesAreLoaded = process?.children_processes?.every(process => process in processesByID)
    //Process' properties and process' children properties both should be loaded
    const propertiesAreLoaded = process?.children_properties?.every(property => property in propertyValuesByID)
    const childrenPropertiesAreLoaded = process?.children_processes?.
                                          every(process => processesByID[process]?.children_properties?.
                                            every(property => property in propertyValuesByID))
    const allPropertiesAreLoaded = propertiesAreLoaded && childrenPropertiesAreLoaded

    const onClickHandler = fileID =>
      withToken(token, api.importedFiles.download)(fileID)
        .then(response => downloadFromFile(response.filename, response.data))
        .catch((err) => {
          notification.error({message:"Template Unavailable", description:"The template file could not be retrieved."})
        })

    if (!isLoaded) {
      listProcesses({id__in: id});
    }

    if(isLoaded && !childrenProcessesAreLoaded){
      // Need to be queried as a string, not as an array in order to work with DRF filters
      const processIDSAsStr = [id].concat(process.children_processes).join()
      listProcesses({id__in:processIDSAsStr});
    }

    if (isLoaded && childrenProcessesAreLoaded && !allPropertiesAreLoaded) {
      // Need to be queried as a string, not as an array in order to work with DRF filters
      const processIDSAsStr = [id].concat(process.children_processes).join()
      listPropertyValues({ object_id__in: processIDSAsStr, content_type__model: "process" });
    }

    const isLoading = !isLoaded || process.isFetching;
    const title =
        `Process ${[id, process && protocolsByID[process.protocol]?.name ].filter(Boolean).join(' - ')}`;

    return <>
        <AppPageHeader title={title} onBack={() => history.push("/process-measurements/list")}/>
        <PageContent loading={isLoading}>
          <Tabs defaultActiveKey="1" size="large" type="card">
            <TabPane tab="Overview" key="1" style={{marginTop:8} }>
              <Descriptions bordered={true} size="small" column={4}>
                  <Descriptions.Item label="Protocol" span={4}>{protocolsByID[process.protocol]?.name}</Descriptions.Item>
                  {process.parent_process &&
                    <Descriptions.Item label="Parent Process" span={4}>{process.parent_process}</Descriptions.Item>
                  }
                  <Descriptions.Item label="Template Submitted" span={4}>
                      {process?.imported_template &&
                          <Link to="#">
                            <div onClick={() => onClickHandler(process?.imported_template)}>
                              {process.imported_template_filename}
                            </div>
                          </Link>
                      }
                  </Descriptions.Item>
                  <Descriptions.Item label="Comment" span={4}>{process.comment}</Descriptions.Item>
              </Descriptions>
              <TrackingFieldsContent entity={process}/>
            </TabPane>
            <TabPane tab="Properties" key="2" style={{marginTop:8} }>
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
              </TabPane>
            </Tabs>
        </PageContent>
    </>;
};

export default connect(mapStateToProps, actionCreators)(ProcessDetailContent);
