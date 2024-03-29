import React, { useEffect } from "react";
import { connect } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Descriptions, Typography, Tabs, notification } from "antd";
const { TabPane } = Tabs;
const { Title } = Typography;

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import TrackingFieldsContent from "../TrackingFieldsContent";
import { list as listProcesses, get as getProcess } from "../../modules/processes/actions";
import { downloadFromFile } from "../../utils/download";
import api, { withToken } from "../../utils/api"
import AllProcessProperties from "../shared/AllProcessProperties";
import ProcessAssociatedMeasurements from "../shared/ProcessAssociatedMeasurements"
import useHashURL from "../../hooks/useHashURL";
import { useAppDispatch } from "../../hooks";
import { notifyError } from "../../modules/notification/actions";

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  processesByID: state.processes.itemsByID,
  propertyValuesByID: state.propertyValues.itemsByID,
  protocolsByID: state.protocols.itemsByID,
});

const actionCreators = { listProcesses, getProcess };

const ProcessDetailContent = ({
  processesByID,
  protocolsByID,
  listProcesses,
  getProcess,
  token
}) => {
  const dispatch = useAppDispatch()
  const history = useNavigate();
  const { id } = useParams();
  const [activeKey, setActiveKey] = useHashURL('overview')
  const isLoaded = id in processesByID;
  const process = processesByID[id] || {};

  const onClickHandler = fileID =>
    withToken(token, api.importedFiles.download)(fileID)
      .then(response => downloadFromFile(response.filename, response.data))
      .catch((err) => {
        dispatch(notifyError({
          id: "ProcessDetailContent: Template Unavailable",
          title: "Template Unavailable",
          description: "The template file could not be retrieved.",
          duration: 0,
        }))
      })

  useEffect(() => {
    (async () => {
      if (!isLoaded) {
        await getProcess(id);
      }
    })()
  }, [processesByID, id])

  const isLoading = !isLoaded || process.isFetching;
  const title =
    `Process ${[id, process && protocolsByID[process.protocol]?.name].filter(Boolean).join(' - ')}`;

  return <>
    <AppPageHeader title={title} />
    <PageContent loading={isLoading}>
      <Tabs activeKey={activeKey} onChange={setActiveKey} size="large" type="card">
        <TabPane tab="Overview" key="overview" style={{ marginTop: 8 }}>
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
          <TrackingFieldsContent entity={process} />
        </TabPane>
        <TabPane tab="Properties" key="properties" style={{ marginTop: 8 }}>
          <Title level={3} style={{ marginTop: '20px' }}>Shared Process Properties</Title>
          <AllProcessProperties id={id} />
          <Title level={3} style={{ marginTop: '20px' }}>Sample Processes with Properties</Title>
          <ProcessAssociatedMeasurements process={process} />
        </TabPane>
      </Tabs>
    </PageContent>
  </>;
};

export default connect(mapStateToProps, actionCreators)(ProcessDetailContent);
