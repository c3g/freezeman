import React, { useState } from "react";
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import {useHistory, useParams} from "react-router-dom";
import {map, sortBy, compose, groupBy, path, values, reverse} from "rambda";

import {
  Button,
  Card,
  Descriptions,
  Table,
  Timeline,
  Typography,
  Row,
  Col
} from "antd";
import "antd/es/table/style/css";
import {
 MinusSquareOutlined,
  PlusSquareOutlined,
  CheckOutlined,
  CloseOutlined
} from "@ant-design/icons";

import dateToString from "../../utils/dateToString";
import useTimeline from "../../utils/useTimeline";
import weakMapMemoize from "../../utils/weak-map-memoize";
import itemRender from "../../utils/breadcrumbItemRender";
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import ErrorMessage from "../ErrorMessage";
import routes from "./routes";
import {listVersions} from "../../modules/users/actions";

const { Title, Text } = Typography;

const groupByRevisionID = weakMapMemoize(
  compose(
    map(sortBy(path(['content_type', 'id']))),
    reverse,
    values,
    groupBy(path(['revision', 'id']))
  ))

const route = {
  path: "/user",
  breadcrumbName: "User",
};

const columns = [
  { title: 'Model', dataIndex: ['content_type', 'model'], key: 'model', width: 80 },
  { title: 'Name', dataIndex: 'object_repr', key: 'name' },
];

const mapStateToProps = state => ({
  isFetching: state.users.isFetching,
  usersError: state.users.error,
  usersByID: state.users.itemsByID,
});

const mapDispatchToProps = dispatch =>
  bindActionCreators({listVersions}, dispatch);

const ReportsUserContent = ({isFetching, usersError, usersByID, listVersions}) => {
  const history = useHistory();
  const {id} = useParams();

  const user = usersByID[id];

  if (user && !user.versions && !user.isFetching)
      listVersions(user.id);

  return (
    <>
      <AppPageHeader
        title="User"
        onBack={history.goBack}
        breadcrumb={{ routes: routes.concat(route), itemRender }}
      />
      <PageContent>
        {usersError &&
          <ErrorMessage
            error={usersError}
          />
        }
        {!isFetching && !user &&
          <ErrorMessage
            title="Invalid user ID"
            description="The user you are trying to view doesn't seem to exist."
          />
        }
        {user &&
          renderUserReport(user)
        }
      </PageContent>
    </>
  )

};

function renderUserReport(user) {
  const [timelineMarginLeft, timelineRef] = useTimeline();

  const error = user.error;
  const isFetching = user.isFetching;
  const versions = user.versions;

  return (
    <>
      {error &&
        <ErrorMessage error={error} />
      }
      <Title level={2}>Details</Title>
      <Descriptions bordered={true} size="small" column={1}>
        <Descriptions.Item label="Name">{user.username}</Descriptions.Item>
        <Descriptions.Item label="Date joined">{dateToString(user.date_joined)}</Descriptions.Item>
        <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
        <Descriptions.Item label="Groups">{user.groups.join(", ")}</Descriptions.Item>
        <Descriptions.Item label="Staff">{user.is_staff ? <CheckOutlined /> : <CloseOutlined />}</Descriptions.Item>
        <Descriptions.Item label="Superuser">{user.is_superuser ? <CheckOutlined /> : <CloseOutlined />}</Descriptions.Item>
      </Descriptions>


      <Title level={2} style={{ marginTop: '1em' }}>History</Title>
      <Row>
        <Col sm={24} md={24}>
          <div ref={timelineRef}>
            <Card>
              <Timeline mode="left" style={{ marginLeft: timelineMarginLeft }}>
                {versions === undefined && isFetching &&
                  <Timeline.Item pending={true}>Loading...</Timeline.Item>
                }
                {versions && groupByRevisionID(versions).map((group, i) =>
                  <Timeline.Item
                    key={i}
                    label={renderTimelineLabel(group[0].revision)}
                  >
                    <TimelineEntry group={group} />
                  </Timeline.Item>
                )}
              </Timeline>
            </Card>
          </div>
        </Col>
      </Row>
    </>
  )
}

const expandIconStyle = {
  color: "rgba(0, 0, 0, 0.2)",
  textDecoration: "none",
  marginRight: '0.5em',
  marginBottom: -2,
}

const expandButtonStyle = {
  color: "#222222",
  fontWeight: "bold",
  textDecoration: "none",
}

const tableStyle = {
  marginLeft: '2em',
  marginTop: '0.5em',
}

function TimelineEntry({ group }) {
  const [isExpanded, setExpanded] = useState(false);

  const revision = group[0].revision

  return (
    <>
      <div>
        <Button
          type="link"
          size="small"
          style={expandButtonStyle}
          onClick={() => setExpanded(!isExpanded)}
        >
          <span style={expandIconStyle}>
            {isExpanded ? <MinusSquareOutlined /> : <PlusSquareOutlined />}
          </span>{' '}{revision.comment}
        </Button>
      </div>
      {isExpanded &&
        <Table
          size="small"
          style={tableStyle}
          columns={columns}
          expandable={{
            expandedRowRender: version =>
              <p style={{ margin: 0 }}>
                {version.serialized_data}
              </p>,
            rowExpandable: () => true,
          }}
          dataSource={group}
        />
      }
    </>
  )
}

function renderTimelineLabel(revision) {
  return (
    <Text type="secondary">{dateToString(revision.date_created)}</Text>
  )
}

export default connect(mapStateToProps, mapDispatchToProps)(ReportsUserContent);
