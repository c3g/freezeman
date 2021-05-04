import React from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";

import {Table, Tag} from "antd";

import {withUser, withProtocol} from "../../utils/withItem";


const mapStateToProps = state => ({
  usersByID: state.users.itemsByID,
  protocolsByID: state.protocols.itemsByID,
});

const SampleDetailProcess = ({processes, usersByID, protocolsByID,}) => {
    const columns = [
      {
        title: '',
        dataIndex: 'id',
        key: 'id',
        render: (id, _) =>
          <Link to={`/processes/${id}`}>
            Process #{id}
          </Link>,
      },
      {
        title: 'Execution Date',
        dataIndex: 'execution_date',
        key: 'execution_date',
      },
      {
        title: 'Protocol',
        dataIndex: 'protocol',
        key: 'protocol',
        render: (protocolID, _) =>
            <div>
              {withProtocol(protocolsByID, protocolID, protocol => <Tag>{protocol.name}</Tag>,)}
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
              {withUser(usersByID, userID, user => user.username)}
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
        dataSource={processes}
      />
    </>
}


export default connect(mapStateToProps, undefined)(SampleDetailProcess);