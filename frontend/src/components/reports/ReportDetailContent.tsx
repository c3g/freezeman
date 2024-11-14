import { Card, Flex, Typography } from 'antd';
import React, { FunctionComponent } from 'react'
import { dummyData } from './interfaces';
import { AlertTwoTone } from "@ant-design/icons";

interface ReportDetailContentProps {
  reportType: string
  reportData: dummyData[] /*| ReportData[] */
}

const ReportDetailContent: FunctionComponent<ReportDetailContentProps> = ({reportData,reportType}) => {

  const dataDisplay = () =>
      <Flex gap="middle" style={{ alignItems:'baseline', justifyContent:'flex-start'}}>
        <AlertTwoTone />
        <div style={{textAlign: 'justify'}}>
          <Typography.Title level={5}> Validated / Released </Typography.Title>
          <Typography.Text about="testing">
            It is important to take care of the patient, to be followed by the patient, but it will happen at such a time that there is a lot of work and pain.
            For to come to the smallest detail, no one should practice any kind of work unless he derives some benefit from it.
          </Typography.Text>
        </div>
      </Flex>

  return (
    <Card title={reportType} extra={<>date</>}>
      {dataDisplay()}
      {dataDisplay()}
    </Card>
   );
}

export default ReportDetailContent;