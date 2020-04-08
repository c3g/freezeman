import React from "react";

import {Tabs} from "antd";
import "antd/es/tabs/style/css";

import AppPageHeader from "./AppPageHeader";
import PageContainer from "./PageContainer";
import PageContent from "./PageContent";

const ReportingPage = () => <PageContainer>
    <AppPageHeader title="Reporting"
                  ghost={false}
                  footer={
                      <Tabs defaultActiveKey="individuals">
                          <Tabs.TabPane tab="Individuals" key="individuals" />
                          <Tabs.TabPane tab="Users" key="users" />
                          <Tabs.TabPane tab="Samples" key="samples" />
                      </Tabs>
                  } />
    <PageContent />
</PageContainer>;

export default ReportingPage;
