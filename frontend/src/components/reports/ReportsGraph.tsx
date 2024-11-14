import { Card } from 'antd';
import React, { FunctionComponent } from 'react'
import { dummyData } from './interfaces';
import { Content } from 'antd/es/layout/layout';
import { Pie } from '@ant-design/plots';

interface ReportsGraphProps {
  reportType: string
  reportData: dummyData[] /*| ReportData[] */
}

const ReportsGraph: FunctionComponent<ReportsGraphProps> = ({reportData,reportType}) => {
  const config = {
    data: reportData,
    angleField: 'readset_count',
    colorField: 'project',
    innerRadius: 0.6,
    label: {
      text: 'project',
      style: {
        fontWeight: 'bold',
      },
    },
    style: {
      inset: 0.5
    },
    legend: {
      color: {
        title: false,
        position: 'right',
        rowPadding: 5,
      },
    },
    height: 250,
  }

  return (
    <Card loading={false} extra={<></>} title={reportType}>
      <Content>
        <Pie {...config} />
      </Content>
    </Card>
  );
}

export default ReportsGraph;

