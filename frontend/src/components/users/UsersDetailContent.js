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
  Tag,
  Table,
  Timeline,
  Typography,
} from "antd";
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
import EditButton from "../EditButton";
import {listRevisions, listVersions, get} from "../../modules/users/actions";
import routes from "./routes";
import canWrite from "./canWrite";

const { Title, Text } = Typography;



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
  canWrite: canWrite(state),
  isFetching: state.users.isFetching,
  usersError: state.users.error,
  usersByID: state.users.itemsByID,
  groupsByID: state.groups.itemsByID,
});

const mapDispatchToProps = {get, listRevisions, listVersions};

const ReportsUserContent = ({canWrite, isFetching, usersError, usersByID, groupsByID, get, listRevisions, listVersions}) => {
  const history = useHistory();
  const {id} = useParams();
  const [expandedGroups, setExpandedGroups] = useState({});

  const user = usersByID[id];

  if (!isFetching && !user) {
    get(id)
  }

  if (user && !user.revisions && !user.isFetching) {
    setTimeout(() => listRevisions(user.id), 0);
  }

  const onLoadMore = () => {
    listRevisions(user.id)
  }

  return (
    <>
      <AppPageHeader
        title="User"
        onBack={history.goBack}
        breadcrumb={{ routes: routes.concat(route), itemRender }}
        extra={canWrite ?
          <EditButton url={`/users/${id}/update`} /> : undefined
        }
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
            groupsByID={groupsByID}
            expandedGroups={expandedGroups}
            setExpandedGroups={setExpandedGroups}
            onLoadMore={onLoadMore}
            listVersions={listVersions}
          />
        }
      </PageContent>
    </>
  )

};

function UserReport({user, groupsByID, expandedGroups, setExpandedGroups, onLoadMore, listVersions}) {

  const error = user.error;
  const isFetching = user.isFetching;
  const revisions = user.revisions;
  const hasRevisions = revisions?.results !== undefined
  const isFetchingRevisions = user.revisions?.isFetching;
  const groups = hasRevisions ? revisions.results : [];

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
        <Descriptions.Item label="Groups">
          {user.groups?.map?.(g => <Tag key={g}>{groupsByID[g]?.name}</Tag>)}
        </Descriptions.Item>
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
              pending={(isFetching && !revisions) ? "Loading..." : undefined}
              mode="left"
              style={{ marginLeft: 0, width: '100%' }}
            >
              {revisions === undefined && isFetching &&
                <Timeline.Item pending={true}>Loading...</Timeline.Item>
              }
              {revisions && groups.map((revision, i) =>
                <Timeline.Item
                  key={i}
                  label={renderTimelineLabel(revision)}
                >
                  <TimelineEntry
                    revision={revision}
                    expandedGroups={expandedGroups}
                    setExpandedGroups={setExpandedGroups}
                    listVersions={listVersions}
                  />
                </Timeline.Item>
              )}
            </Timeline>
            {((hasRevisions && revisions.next) || (!hasRevisions && isFetchingRevisions)) &&
              <Button
                block
                type="link"
                loading={isFetching || isFetchingRevisions}
                onClick={onLoadMore}
              >
                Load more
              </Button>
            }
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

function TimelineEntry({ revision, expandedGroups, setExpandedGroups, listVersions }) {
  const isExpanded = expandedGroups[revision.id];
  const [group, setGroup] = useState([]);
  const [isLoading, setIsLoading] = useState(undefined);

  const onClick = () => {
    setIsLoading(true)
    setExpandedGroups(set(expandedGroups, revision.id, !isExpanded))
    listVersions(revision.user, revision.id)
        .then(response => {
          setGroup(response.results)
          console.log(response)
          setIsLoading(false)
        })
  }

  // noinspection JSUnusedGlobalSymbols
  return (
    <>
      <div>
        <Button
          type="link"
          size="small"
          style={expandButtonStyle}
          onClick={onClick}
        >
          <span style={expandIconStyle}>
            {isExpanded ? <MinusSquareOutlined /> : <PlusSquareOutlined />}
          </span>{' '}{revision.comment}{`  #${revision.id}`}
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
          loading={isLoading}
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
