import React from "react";

import {Tabs} from "antd";
import "antd/es/tabs/style/css";
import AppPageHeader from "./AppPageHeader";

const ReportingPage = () => (
    <div style={{height: "100%", backgroundColor: "white", overflowY: "auto"}}>
        <AppPageHeader title="Reporting"
                      ghost={false}
                      footer={
                          <Tabs defaultActiveKey="individuals">
                              <Tabs.TabPane tab="Individuals" key="individuals" />
                              <Tabs.TabPane tab="Users" key="users" />
                              <Tabs.TabPane tab="Samples" key="samples" />
                          </Tabs>
                      } />
        <div style={{padding: "16px 24px 8px 24px", overflowX: "auto"}} />
    </div>
);
export default ReportingPage;
