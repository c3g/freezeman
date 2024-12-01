import React, { FunctionComponent } from 'react'
import AppPageHeader from '../AppPageHeader';
import PageContent from '../PageContent';
import ReportPresetContent from './ReportPresetContent';
import ReportsListContent from './ReportsListContent'
import './Reports.scss'
import { Content } from 'antd/es/layout/layout';

interface ReportsSummaryProps {

}

const ReportsSummary: FunctionComponent<ReportsSummaryProps> = () => {
    const contentStyle: React.CSSProperties = {
      marginBottom: 20,
    };
    // TODO: add the flex component from antd to the summary
  return (
        <PageContent>
          <div className="reports-page">
            <AppPageHeader title="Reports / option 1 display / Quick overview + data table"/>
            <Content>
                <div style={contentStyle}>
                  <ReportPresetContent />
                  <ReportsListContent />
                </div>
            </Content>
          </div>
        </PageContent>
   );
}

export default ReportsSummary;