import { Card, Divider, Flex, Progress, Statistic, Typography } from 'antd';
import React, { FunctionComponent, ReactNode } from 'react'
import { dummyData } from './interfaces';
import { Content } from 'antd/es/layout/layout';

interface ReportsCardProps {
  reportType: string
  reportData: dummyData[]
}

const ReportsCard: FunctionComponent<ReportsCardProps> = ({reportType, reportData}) => {
  /**
   *  Change the report data to display when report type changes
   *  In this instance, we need to update the reportData to display only the 2 or 3 items related
   *  the reportType selected by the user
   */
  return (
  <Card loading={false} extra={<></>} title={reportType}>
    <Content>
      <Flex gap="middle" style={{ alignItems:'baseline', justifyContent:'flex-start', marginTop:'0!important'}}>
        <Typography.Title level={2}>
          <Statistic suffix={"variable data"} value={987} />
        </Typography.Title>
      </Flex>
      <Progress percent={50} status="active" format={(percent) => `${percent}`}/>
      <Divider variant='solid' style={{fontSize:'large', background:'darkGrey'}}/>
      <Typography.Title level={5}>Readsets/Projects</Typography.Title>
      <Content style={{ display:'grid', gridTemplateColumns: '1fr 1fr'}}>
        {cardBodyDetails(reportData)}
      </Content>
    </Content>
  </Card>
 );
}

const cardBodyDetails = (reportData:dummyData[]) => {
  return reportData.map((item:dummyData,index) =>
        <Typography.Text type='secondary' key={index}>
            {item.project_name} : {item.readset_count}
        </Typography.Text>

  )
}


export default ReportsCard;