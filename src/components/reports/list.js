import React from "react";

import {
    ExperimentOutlined,
    SolutionOutlined,
} from "@ant-design/icons";
import { Tag, Typography } from "antd";

import objectByIdToArray from "../../utils/objectByIdToArray";

const { Text } = Typography;

const itemStyle = { display: 'flex', justifyContent: 'space-between' };
const containerStyle = { display: 'inline-block', minWidth: 60 }

const reports = [
  /*
   * {
   *   "id": 4,
   *   "biospecimen_type": "BLOOD",
   *   "name": "sample1",
   *   "alias": "first sample",
   *   "volume_history": [
   *     {
   *       "date": "2020-05-25T20:37:57.082042Z",
   *       "update_type": "update",
   *       "volume_value": "10.000"
   *     },
   *     {
   *       "date": "2020-05-25T20:38:14.854398Z",
   *       "update_type": "extraction",
   *       "volume_value": "9.000",
   *       "extracted_sample_id": 4
   *     },
   *     {
   *       "date": "2020-05-25T20:38:33.012121Z",
   *       "update_type": "update",
   *       "volume_value": "0.001"
   *     }
   *   ],
   *   "concentration": "0.001",
   *   "depleted": false,
   *   "experimental_group": [
   *     "group1"
   *   ],
   *   "collection_site": "site1",
   *   "tissue_source": "",
   *   "reception_date": "2020-03-03",
   *   "phenotype": "phenotype1",
   *   "comment": "some comment here",
   *   "update_comment": "sample updated",
   *   "coordinates": "",
   *   "volume_used": null,
   *   "individual": "David Lougheed",
   *   "container": "tube001",
   *   "extracted_from": null
   * }
   */
  {
    title: "Sample",
    icon: <ExperimentOutlined />,
    description: "View report for a single sample",
    path: "/samples",
    selector: state => objectByIdToArray(state.samples.itemsByID),
    searchKeys: [
      "name",
      "alias",
      "collection_site",
      "tissue_source",
      "phenotype",
      "biospecimen_type",
      "experimental_group",
      "individual",
      "container",
    ],
    renderItem: item =>
      <div key={item.id} style={itemStyle}>
        <span>
          {/* TODO: Container Barcode */}
          <Text type="secondary" style={containerStyle}>{item.container}</Text>{' '}
          <strong>{item.name}</strong>{' '}
          <Tag size="small">{item.biospecimen_type}</Tag>{' '}
          <Text type="secondary">{item.collection_site}</Text> —{' '}
          <Text type="secondary">{item.phenotype || <em>[no phenotype]</em>}</Text>
        </span>
        <span>
          {item.individual}
        </span>
      </div>,
  },

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
    description: "View report for a user",
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
