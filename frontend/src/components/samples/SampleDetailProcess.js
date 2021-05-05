import React from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";

import {Table, Tag} from "antd";


const mapStateToProps = state => ({
  usersByID: state.users.itemsByID,
  protocolsByID: state.protocols.itemsByID,
});

const SampleDetailProcess = ({processSamples, usersByID, protocolsByID,}) => {
    const columns = [
      {
        title: '',
        dataIndex: 'id',
        key: 'id',
        render: (id, processSample) =>
          <Link to={`/processes/${id}`}>
            Process {processSample && `#${processSample.process}`}
          </Link>,
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
        title: 'Volume used',
        dataIndex: 'volume_used',
        key: 'volume_used',
        render: (volumeUsed, _) =>
            <div>
              {volumeUsed ? `${parseFloat(volumeUsed).toFixed(3)} µL` : undefined}
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

    return <>
      <Table
        size="small"
        bordered={false}
        pagination={false}
        columns={columns}
        dataSource={processSamples}
      />
    </>
}


export default connect(mapStateToProps, undefined)(SampleDetailProcess);