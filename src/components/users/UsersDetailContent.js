import React, { useState } from "react";
import {connect} from "react-redux";
import {useHistory, useParams} from "react-router-dom";
import {
  compose,
  groupBy,
  map,
  path,
  reduce,
  reverse,
  sortBy,
  values,
} from "rambda";
import {set} from "object-path-immutable";

import {
  Button,
  Card,
  Col,
  Descriptions,
  Row,
  Space,
  Table,
  Timeline,
  Typography,
} from "antd";
import "antd/es/button/style/css";
import "antd/es/card/style/css";
import "antd/es/col/style/css";
import "antd/es/descriptions/style/css";
import "antd/es/row/style/css";
import "antd/es/space/style/css";
import "antd/es/table/style/css";
import "antd/es/timeline/style/css";
import "antd/es/typography/style/css";
import {
  ArrowsAltOutlined,
  ShrinkOutlined,
  MinusSquareOutlined,
  PlusSquareOutlined,
  CheckOutlined,
  CloseOutlined
} from "@ant-design/icons";

import dateToString from "../../utils/dateToString";
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

const getTrueByID =
  compose(
    reduce((acc, cur) => (acc[cur] = true, acc), {}),
    map(path([0, 'revision', 'id']))
  )

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

const mapDispatchToProps = {listVersions};

const ReportsUserContent = ({isFetching, usersError, usersByID, listVersions}) => {
  const history = useHistory();
  const {id} = useParams();
  const [expandedGroups, setExpandedGroups] = useState({});

  const user = usersByID[id];

  if (user && !user.versions && !user.isFetching) {
    setTimeout(() => listVersions(user.id), 0);
  }

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
          <UserReport
            user={user}
            expandedGroups={expandedGroups}
            setExpandedGroups={setExpandedGroups}
          />
        }
      </PageContent>
    </>
  )

};

function UserReport({user, expandedGroups, setExpandedGroups}) {

  const error = user.error;
  const isFetching = user.isFetching;
  const versions = user.versions;
  const groups = versions ? groupByRevisionID(versions) : [];

  const expandAll = () => setExpandedGroups(getTrueByID(groups));
  const closeAll = () => setExpandedGroups({});

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
        <Descriptions.Item label="Groups">{user.groups.map(g => g.name).join(", ")}</Descriptions.Item>
        <Descriptions.Item label="Staff">{user.is_staff ? <CheckOutlined /> : <CloseOutlined />}</Descriptions.Item>
        <Descriptions.Item label="Superuser">{user.is_superuser ? <CheckOutlined /> : <CloseOutlined />}</Descriptions.Item>
      </Descriptions>

      <Title level={2} style={{ marginTop: '1em' }}>
        History
      </Title>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Row>
          <Col sm={24}>
            <Button.Group>
              <Button type="secondary" size="small" onClick={expandAll} icon={<ArrowsAltOutlined />}>
                Expand All
              </Button>
              <Button type="secondary" size="small" onClick={closeAll} icon={<ShrinkOutlined />}>
                Close All
              </Button>
            </Button.Group>
          </Col>
        </Row>
        <div style={{ width: '100%' }}>
          <Card>
            <Timeline
              pending={(isFetching && !versions) ? "Loading..." : undefined}
              mode="left"
              style={{ marginLeft: 0, width: '100%' }}
            >
              {versions === undefined && isFetching &&
                <Timeline.Item pending={true}>Loading...</Timeline.Item>
              }
              {versions && groups.map((group, i) =>
                <Timeline.Item
                  key={i}
                  label={renderTimelineLabel(group[0].revision)}
                >
                  <TimelineEntry
                    group={group}
                    expandedGroups={expandedGroups}
                    setExpandedGroups={setExpandedGroups}
                  />
                </Timeline.Item>
              )}
            </Timeline>
          </Card>
        </div>
      </Space>
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

function TimelineEntry({ group, expandedGroups, setExpandedGroups }) {
  const revision = group[0].revision
  const isExpanded = expandedGroups[revision.id];

  // noinspection JSUnusedGlobalSymbols
  return (
    <>
      <div>
        <Button
          type="link"
          size="small"
          style={expandButtonStyle}
          onClick={() => setExpandedGroups(set(expandedGroups, revision.id, !isExpanded))}
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
