import React from "react";

import { SolutionOutlined } from "@ant-design/icons";
import { Tag, Typography } from "antd";

import objectByIdToArray from "../../utils/objectByIdToArray";

const { Text } = Typography;

const itemStyle = { display: 'flex', justifyContent: 'space-between' };

const reports = [
  /*
   * {
   *   "id": 1,
   *   "username": "romgrk",
   *   "email": "",
   *   "groups": [],
   *   "is_staff": true,
   *   "is_superuser": true,
   *   "date_joined": "2020-05-25T20:35:40.599963Z"
   * }
   */
  {
    title: "User",
    icon: <SolutionOutlined />,
    description: "Search for user",
    path: "/reports/user",
    selector: state => objectByIdToArray(state.users.itemsByID),
    searchKeys: [
      "username",
      "email",
      "groups",
    ],
    renderItem: item =>
      <div key={item.id} style={itemStyle}>
        <span>
          <strong>{item.username}</strong>{' '}
          {item.groups.map(g =>
            <Tag>{g.name}</Tag>
          )}
        </span>

        <Text type="secondary">
          {item.email}
        </Text>
      </div>,
  },
];

export default reports;
