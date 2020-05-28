import React, {useEffect} from "react";
import {bindActionCreators} from "redux";
import {hot} from "react-hot-loader/root";
import {connect} from "react-redux";
import {Redirect, Route, Switch, withRouter} from "react-router-dom";
import jwtDecode from "jwt-decode";

import {Card, Layout, Menu, Typography} from "antd";
import "antd/es/card/style/css";
import "antd/es/layout/style/css";
import "antd/es/menu/style/css";

import {
  AuditOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  LoginOutlined,
  LogoutOutlined,
  TableOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";

import SignInForm from "./SignInForm";

import ContainersPage from "./containers/ContainersPage";
import DashboardPage from "./DashboardPage";
import SamplesExtractionsPage from "./samples/SamplesExtractionsPage";
import IndividualsPage from "./individuals/IndividualsPage";
import ReportsPage from "./reports/ReportsPage";

import PrivateRoute from "./PrivateRoute";

import {matchingMenuKeys, renderMenuItem} from "../utils/menus";
import {fetchAuthorizedData} from "../modules/shared/actions";
import {invalidateAuth, refreshAuthToken} from "../modules/auth/actions";

const { Title } = Typography;

const horizontalMenuItems = (user, invalidateAuth) => user ? [
    {
      key: "sign-out-link",
      icon: <LogoutOutlined />,
      text: "Sign Out",
      onClick: () => invalidateAuth(),
    },
  ] : [
    {
      url: "/sign-in",
      icon: <LoginOutlined />,
      text: "Sign In",
    }
  ]

// TODO: Disabled if not authenticated
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
    url: "/reports",
    icon: <AuditOutlined />,
    text: "Reports",
  },
]

const colorStyle = {
  color: "white",
}

const titleStyle = {
  ...colorStyle,
  width: 124,
  textAlign: "center",
  fontWeight: 900,
  fontSize: "20px",
  lineHeight: "unset",
  padding: 0,
  margin: 0,
};

const cardStyle = {
  boxSizing: "border-box",
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  maxWidth: "396px",
  width: "100%",
};

export const mapStateToProps = state => ({
  user: state.auth.tokens.access
    ? (state.users.itemsByID[jwtDecode(state.auth.tokens.access).user_id] || {username: "Loading..."}).username
    : null,
});

// noinspection JSUnusedGlobalSymbols
export const mapDispatchToProps = dispatch =>
  bindActionCreators({fetchAuthorizedData, refreshAuthToken, invalidateAuth}, dispatch);

const App = ({user, fetchAuthorizedData, refreshAuthToken, invalidateAuth}) => {
  useEffect(() => {
    const refreshData = () =>
        refreshAuthToken().then(fetchAuthorizedData);

    refreshData();

    const interval = setInterval(() => refreshData(), 30000);
    return () => clearInterval(interval);
  });

  return (
    <Layout style={{height: "100vh"}}>
      <Layout.Header style={{display: "flex"}}>
        <Title style={titleStyle}>FreezeMan</Title>
        <div style={{flex: 1}}/>
        {user &&
          <div style={colorStyle}>
            <strong><UserOutlined /> {user}</strong>
          </div>
        }
        <Menu theme="dark"
            mode="horizontal"
            selectedKeys={matchingMenuKeys(horizontalMenuItems(user, null))}>
          {horizontalMenuItems(user, invalidateAuth).map(renderMenuItem)}
        </Menu>
      </Layout.Header>
      <Layout>
        <Layout.Sider theme="light" style={{overflowY: "auto"}} breakpoint="md" collapsedWidth={80} width={224}>
            <Menu mode="inline" selectedKeys={matchingMenuKeys(MENU_ITEMS)}>
                {MENU_ITEMS.map(renderMenuItem)}
            </Menu>
        </Layout.Sider>
        <Layout.Content style={{position: "relative"}}>
          <Switch>
            <Route path="/sign-in">
              <Card style={cardStyle} bodyStyle={{paddingBottom: 0}}>
                <SignInForm/>
              </Card>
            </Route>
            <PrivateRoute path="/dashboard">
              <DashboardPage/>
            </PrivateRoute>
            <PrivateRoute path="/containers">
              <ContainersPage/>
            </PrivateRoute>
            <PrivateRoute path="/samples">
              <SamplesExtractionsPage/>
            </PrivateRoute>
            <PrivateRoute path="/individuals">
              <IndividualsPage/>
            </PrivateRoute>
            <PrivateRoute path="/reports">
              <ReportsPage/>
            </PrivateRoute>
            <Redirect from="/" to="/dashboard" />
          </Switch>
        </Layout.Content>
      </Layout>
    </Layout>
  );
};

export default hot(withRouter(connect(mapStateToProps, mapDispatchToProps)(App)));
