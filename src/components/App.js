import React from "react";

import {Card, Layout, Menu} from "antd";
import "antd/es/card/style/css";
import "antd/es/layout/style/css";
import "antd/es/menu/style/css";

import {
    AuditOutlined,
    DashboardOutlined,
    ExperimentOutlined,
    LoginOutlined,
    SearchOutlined,
    TableOutlined,
    TeamOutlined,
} from "@ant-design/icons";

import SignInForm from "./SignInForm";

import ContainersPage from "./ContainersPage";
import DashboardPage from "./DashboardPage";

const App = () => (
    <Layout style={{height: "100vh"}}>
        <Layout.Header style={{display: "flex"}}>
            <div style={{color: "white", width: 156, textAlign: "center", fontSize: "20px"}}>FreezeMan</div>
            <div style={{flex: 1}} />
            <Menu theme="dark" mode="horizontal">
                <Menu.Item key="sign-in">
                    <LoginOutlined />
                    Sign In
                </Menu.Item>
            </Menu>
        </Layout.Header>
        <Layout>
            <Layout.Sider style={{overflowY: "auto"}} width={256}>
                <Menu theme="dark" mode="inline">
                    <Menu.Item key="dashboard">
                        <DashboardOutlined />
                        Dashboard
                    </Menu.Item>
                    <Menu.Item key="search">
                        <SearchOutlined />
                        Search
                    </Menu.Item>
                    <Menu.Item key="containers">
                        <TableOutlined />
                        Containers
                    </Menu.Item>
                    <Menu.Item key="samples-extractions">
                        <ExperimentOutlined />
                        Samples &amp; Extractions
                    </Menu.Item>
                    <Menu.Item key="individuals">
                        <TeamOutlined />
                        Individuals
                    </Menu.Item>
                    <Menu.Item key="reporting">
                        <AuditOutlined />
                        Reporting
                    </Menu.Item>
                </Menu>
            </Layout.Sider>
            <Layout.Content style={{position: "relative"}}>
                {/*<Card style={{*/}
                {/*    boxSizing: "border-box",*/}
                {/*    position: "absolute",*/}
                {/*    top: "50%",*/}
                {/*    left: "50%",*/}
                {/*    transform: "translate(-50%, -50%)",*/}
                {/*    maxWidth: "396px",*/}
                {/*    width: "100%",*/}
                {/*}} bodyStyle={{paddingBottom: 0}}>*/}
                {/*    <SignInForm />*/}
                {/*</Card>*/}
                {/*<DashboardPage />*/}
                <ContainersPage />
            </Layout.Content>
        </Layout>
    </Layout>
);

export default App;
