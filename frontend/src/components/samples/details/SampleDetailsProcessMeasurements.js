import React from "react";
import {Link} from "react-router-dom";

import {Table, Tag, Empty} from "antd";
import { isNullish } from "../../../utils/functions";
import { useAppSelector } from "../../../hooks";
import { selectProtocolsByID, selectUsersByID } from "../../../selectors";


const SampleDetailsProcessMeasurements = ({processMeasurements}) => {
  const usersByID = useAppSelector(selectUsersByID)
  const protocolsByID = useAppSelector(selectProtocolsByID)

    const columns = [
      {
        title: 'Sample Process ID',
        dataIndex: 'id',
        key: 'id',
        render: (id, _) =>
          <Link to={`/process-measurements/${id}`}>{id}</Link>

      },
      {
        title: "Process ID",
        dataIndex: "process",
        width: 150,
        render: (process, _) =>
            <Link to={`/processes/${process}`}>{process}</Link>
      },
      {
        title: 'Date processed',
        dataIndex: 'execution_date',
        key: 'execution_date',
      },
      {
        title: 'Protocol',
        dataIndex: 'protocol',
        key: 'protocol',
        render: (protocolID, _) =>
            <div>
              {protocolsByID?.[protocolID] && <Tag> {protocolsByID[protocolID].name} </Tag>}
            </div>
      },
      {
        title: 'Volume used (µL)',
        dataIndex: 'volume_used',
        key: 'volume_used',
        align: 'right',
        render: (volumeUsed, _) =>
            <div>
              {isNullish(volumeUsed) ? '' : `${parseFloat(volumeUsed).toFixed(3)}`}
            </div>
      },
      {
        title: 'User',
        dataIndex: 'created_by',
        key: 'created_by',
        render: (userID, _) =>
            <div>
              {usersByID?.[userID] && <span> {usersByID[userID].username} </span>}
            </div>
      },
      {
        title: 'Comment',
        dataIndex: 'comment',
        key: 'comment',
      },
    ]

    if (processMeasurements.length === 0)
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;

    return (
      <Table
        size="small"
        bordered={false}
        pagination={false}
        columns={columns}
        dataSource={processMeasurements}
      />
    );
}


export default SampleDetailsProcessMeasurements
