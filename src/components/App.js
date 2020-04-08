import React from "react";

import {Route, Switch, withRouter} from "react-router-dom";

import {Card, Layout, Menu} from "antd";
import "antd/es/card/style/css";
import "antd/es/layout/style/css";
import "antd/es/menu/style/css";

import {
    AuditOutlined,
    DashboardOutlined,
    ExperimentOutlined,
    LoginOutlined,
    TableOutlined,
    TeamOutlined,
} from "@ant-design/icons";

import SignInForm from "./SignInForm";

import ContainersPage from "./containers/ContainersPage";
import DashboardPage from "./DashboardPage";
import SamplesExtractionsPage from "./samples/SamplesExtractionsPage";
import IndividualsPage from "./IndividualsPage";
import ReportingPage from "./ReportingPage";
import {matchingMenuKeys, renderMenuItem} from "../utils/menus";

const MENU_ITEMS = [
    {
        url: "/dashboard",
        icon: <DashboardOutlined />,
        text: "Dashboard",
    },
    {
        url: "/containers",
        icon: <TableOutlined />,
        text: "Containers",
    },
    {
        url: "/samples",
        icon: <ExperimentOutlined />,
        text: "Samples & Extractions",
    },
    {
        url: "/individuals",
        icon: <TeamOutlined />,
        text: "Individuals",
    },
    {
        url: "/reporting",
        icon: <AuditOutlined />,
        text: "Reporting",
    },
]

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
                <Menu theme="dark" mode="inline" selectedKeys={matchingMenuKeys(MENU_ITEMS)}>
                    {MENU_ITEMS.map(renderMenuItem)}
                </Menu>
            </Layout.Sider>
            <Layout.Content style={{position: "relative"}}>
                <Switch>
                    <Route path="/sign-in">
                        <Card style={{
                            boxSizing: "border-box",
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            maxWidth: "396px",
                            width: "100%",
                        }} bodyStyle={{paddingBottom: 0}}>
                            <SignInForm />
                        </Card>
                    </Route>
                    <Route path="/dashboard">
                        <DashboardPage />
                    </Route>
                    <Route path="/containers">
                        <ContainersPage />
                    </Route>
                    <Route path="/samples">
                        <SamplesExtractionsPage />
                    </Route>
                    <Route path="/individuals">
                        <IndividualsPage />
                    </Route>
                    <Route path="/reporting">
                        <ReportingPage />
                    </Route>
                </Switch>
            </Layout.Content>
        </Layout>
    </Layout>
);

export default withRouter(App);
