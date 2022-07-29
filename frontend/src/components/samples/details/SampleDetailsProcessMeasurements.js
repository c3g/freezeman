import React from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";

import {Table, Tag, Empty} from "antd";


const mapStateToProps = state => ({
  usersByID: state.users.itemsByID,
  protocolsByID: state.protocols.itemsByID,
});

const SampleDetailsProcessMeasurements = ({processMeasurements, usersByID, protocolsByID,}) => {
    const columns = [
      {
        title: 'ID',
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
              {volumeUsed ? `${parseFloat(volumeUsed).toFixed(3)}` : undefined}
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


export default connect(mapStateToProps, undefined)(SampleDetailsProcessMeasurements);
