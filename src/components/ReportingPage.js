import React from "react";

import {PageHeader, Tabs} from "antd";
import "antd/es/page-header/style/css";
import "antd/es/tabs/style/css";

const ReportingPage = () => (
    <div style={{height: "100%", backgroundColor: "white", overflowY: "auto"}}>
        <PageHeader title="Reporting"
                    ghost={false}
                    style={{borderBottom: "1px solid #f0f0f0", marginBottom: "8px"}}
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
