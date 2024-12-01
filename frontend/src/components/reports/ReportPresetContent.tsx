import React, { FunctionComponent, useEffect, useState } from 'react'
import { Card, Dropdown, Space, Button, MenuProps, Flex } from "antd";
import ReportsCard from './ReportsCard';
import './Reports.scss'
import dummy from './dummy.json'
import { dummyData } from './interfaces'
import { Content } from 'antd/es/layout/layout';
import ReportsGraph from './ReportsGraph';
import ReportDetailContent from './ReportDetailContent';

interface ReportsPresetContentProps {

}

const ReportsPresetContent: FunctionComponent<ReportsPresetContentProps> = () => {
    const contentStyle: React.CSSProperties = {
      color: '#fff',
      textAlign: 'center',
      display: 'grid',
      gridTemplateColumns:'21vw 41vw auto',
    };
    const [reportData, setReportData] = useState<dummyData[] /*| ReportData[]*/>()

    useEffect(() => {
      console.log(dummy)

    }, [dummy])

    const onClickPresetReport = (item) =>{
      setReportType(item.key)
    }
    const [reportType, setReportType] = useState('')
    const items: MenuProps['items'] = [
      {
        key: 'production_report',
        label: 'preset 1',
        onClick: item => onClickPresetReport(item),
      },
      {
        key: 'project_report',
        label: 'preset 2',
        onClick: item => onClickPresetReport(item),
      },
      {
        key: 'libraries_report',
        label: 'preset 3',
        onClick: item => onClickPresetReport(item),
      },
    ];
  return (
    <Content>
      <Flex justify='flex-end'>
      <Dropdown menu={{ items }} placement="bottom">
        <Button>Report Presets</Button>
      </Dropdown>
      </Flex>
      <Content style={contentStyle}>
        <ReportsCard reportType={reportType} reportData={dummy}/>
        <ReportsGraph reportType={reportType} reportData={dummy}/>
        <ReportDetailContent reportType={reportType} reportData={dummy}/>
      </Content>
    </Content>
  );
}

export default ReportsPresetContent;