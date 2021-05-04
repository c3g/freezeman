import React from "react";

import {
  Table,
} from "antd";


const SampleDetailProcess = ({processes}) => {
    const columns = [
      {
        title: '#',
        dataIndex: 'id',
        key: 'id',
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
      },
      {
        title: 'Volume used',
        dataIndex: 'volume_used',
        key: 'volume_used',
      },
      {
        title: 'Created by',
        dataIndex: 'created_by',
        key: 'created_by',
      },
      {
        title: 'Updated by',
        dataIndex: 'updated_by',
        key: 'updated_by',
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

export default SampleDetailProcess;