import React, {useEffect} from "react";
import {hot} from "react-hot-loader/root";
import {connect} from "react-redux";
import {Redirect, Route, Switch, withRouter} from "react-router-dom";
import {Layout, Menu, Typography} from "antd";
import {
  AuditOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  LogoutOutlined,
  TableOutlined,
  TeamOutlined,
  UserOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

import JumpBar from "./JumpBar";
import LoginPage from "./login/LoginPage";
import ContainersPage from "./containers/ContainersPage";
import DashboardPage from "./DashboardPage";
import SamplesPage from "./samples/SamplesPage";
import IndividualsPage from "./individuals/IndividualsPage";
import ProcessMeasurementsPage from "./processMeasurements/ProcessMeasurementsPage";
import ProfilePage from "./profile/ProfilePage";
import UsersPage from "./users/UsersPage";
import About from "./About";

import PrivateRoute from "./PrivateRoute";

import useUserInputExpiration from "../utils/useUserInputExpiration";
import {matchingMenuKeys, renderMenuItem} from "../utils/menus";
import {hour} from "../utils/time";

import {fetchInitialData, fetchSummariesData} from "../modules/shared/actions";
import {logOut} from "../modules/auth/actions";

const { Title } = Typography;

const getMenuItems = (user, logOut) => [
  {
    key: "about",
    icon: <InfoCircleOutlined />,
    text: "About",
    url: "/about",
  },
  {
    key: "profile-link",
    icon: <UserOutlined />,
    text: `Profile`,
    url: "/profile",
  },
  {
    key: "sign-out-link",
    icon: <LogoutOutlined />,
    text: `Sign Out (${user?.username})`,
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
    text: "Samples",
  },
  {
    url: "/individuals",
    icon: <TeamOutlined />,
    text: "Individuals",
  },
  {
    url: "/process-measurements",
    icon: <ExperimentOutlined />, // ??
    text: "Protocols",
  },
  {
    url: "/users",
    icon: <AuditOutlined />,
    text: "Users",
  },
]

const colorStyle = {
  color: "white",
}

const titleStyle = {
  ...colorStyle,
  width: "100%",
  fontWeight: 900,
  fontSize: "18px",
  lineHeight: "unset",
  padding: 0,
  margin: 0,
};

export const mapStateToProps = state => ({
  userID: state.auth.currentUserID,
  user: state.users.itemsByID[state.auth.currentUserID],
});

export const actionCreators = {fetchInitialData, fetchSummariesData, logOut};

const App = ({userID, user, logOut, fetchInitialData, fetchSummariesData}) => {
  useEffect(() => {
    const interval = setInterval(fetchSummariesData, 30000);
    fetchInitialData();
    return () => clearInterval(interval);
  }, []);

  const isLoggedIn = userID !== null;
  const menuItems = getMenuItems(user, logOut);

  useEffect(onDidMount, []);

  // Logout the user after 12 hours in all cases where the tab stays open
  useUserInputExpiration(logOut, 12 * hour);

  return (
    <Layout style={{height: "100vh"}}>
      <Layout>
        {isLoggedIn &&
          <Layout.Sider
            collapsible
            theme="dark"
            className="App__sidebar"
            breakpoint="md"
            collapsedWidth={80}
            width={224}
          >
              <Title style={titleStyle} className="App__title">
                <div>
                  <b>F</b><span>reeze</span><b>M</b><span>an</span>
                </div>
              </Title>
              {isLoggedIn &&
                <div className='App__jumpBar'>
                  <JumpBar />
                </div>
              }
              <Menu
                theme="dark"
                mode="inline"
                selectedKeys={matchingMenuKeys(MENU_ITEMS)}
                style={{flex: 1}}
              >
                  {MENU_ITEMS.map(renderMenuItem)}
              </Menu>
              {isLoggedIn &&
                <Menu
                  theme="dark"
                  mode="inline"
                  selectedKeys={matchingMenuKeys(menuItems)}
                >
                  {menuItems.map(renderMenuItem)}
                </Menu>
              }
          </Layout.Sider>
        }
        <Layout.Content style={{position: "relative"}}>
          <Switch>
            <Route path="/login">
              <LoginPage/>
            </Route>
            <PrivateRoute path="/dashboard">
              <DashboardPage/>
            </PrivateRoute>
            <PrivateRoute path="/containers">
              <ContainersPage/>
            </PrivateRoute>
            <PrivateRoute path="/samples">
              <SamplesPage/>
            </PrivateRoute>
            <PrivateRoute path="/individuals">
              <IndividualsPage/>
            </PrivateRoute>
            <PrivateRoute path="/process-measurements">
              <ProcessMeasurementsPage/>
            </PrivateRoute>
            <PrivateRoute path="/users">
              <UsersPage/>
            </PrivateRoute>
            <PrivateRoute path="/profile">
              <ProfilePage/>
            </PrivateRoute>
            <PrivateRoute path="/about">
              <About/>
            </PrivateRoute>
            <Redirect from="/" to="/dashboard" />
          </Switch>
        </Layout.Content>
      </Layout>
    </Layout>
  );
};

export default hot(withRouter(connect(mapStateToProps, actionCreators)(App)));

// Helpers

function onDidMount() {
  const title = document.querySelector('.App__title')
  if (title) {
    const span = title.querySelectorAll('span')[0]
    span.style.width = span.getBoundingClientRect().width + 'px'
  }
}
