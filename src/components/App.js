import React, {useEffect} from "react";
import {bindActionCreators} from "redux";
import {hot} from "react-hot-loader/root";
import {connect} from "react-redux";
import {Redirect, Route, Switch, withRouter} from "react-router-dom";

import {Layout, Menu, Typography} from "antd";
import "antd/es/layout/style/css";
import "antd/es/menu/style/css";

import {
  AuditOutlined,
  DashboardOutlined,
  ExperimentOutlined,
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
import {fetchInitialData, fetchAuthorizedData} from "../modules/shared/actions";
import {logOut} from "../modules/auth/actions";

const { Title } = Typography;

const horizontalMenuItems = (logOut) => [
  {
    key: "sign-out-link",
    icon: <LogoutOutlined />,
    text: "Sign Out",
    onClick: logOut,
  },
]

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

export const mapStateToProps = state => ({
  userID: state.auth.currentUserID,
  user: state.users.itemsByID[state.auth.currentUserID],
});

export const mapDispatchToProps = dispatch =>
  bindActionCreators({fetchInitialData, fetchAuthorizedData, logOut}, dispatch);

const App = ({userID, user, logOut, fetchInitialData, fetchAuthorizedData}) => {
  useEffect(() => {
    const interval = setInterval(fetchAuthorizedData, 30000);
    fetchInitialData();
    return () => clearInterval(interval);
  }, []);

  const isLoggedIn = userID !== null;
  const menuItems = horizontalMenuItems(logOut);

  return (
    <Layout style={{height: "100vh"}}>
      <Layout.Header style={{display: "flex"}}>
        <Title style={titleStyle}>FreezeMan</Title>
        <div style={{flex: 1}}/>
        {user &&
          <div style={colorStyle}>
            <strong><UserOutlined /> {user.username}</strong>
          </div>
        }
        {isLoggedIn &&
          <Menu theme="dark"
              mode="horizontal"
              selectedKeys={matchingMenuKeys(menuItems)}>
            {menuItems.map(renderMenuItem)}
          </Menu>
        }
      </Layout.Header>
      <Layout>
        {isLoggedIn &&
          <Layout.Sider theme="light" style={{overflowY: "auto"}} breakpoint="md" collapsedWidth={80} width={224}>
              <Menu mode="inline" selectedKeys={matchingMenuKeys(MENU_ITEMS)}>
                  {MENU_ITEMS.map(renderMenuItem)}
              </Menu>
          </Layout.Sider>
        }
        <Layout.Content style={{position: "relative"}}>
          <Switch>
            <Route path="/sign-in">
              <SignInForm/>
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
