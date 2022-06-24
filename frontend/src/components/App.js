import React, {useEffect} from "react";
import {connect} from "react-redux";
import {Navigate, Route, Routes, useLocation, useNavigate} from "react-router-dom";
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
  ProjectOutlined,
  BarcodeOutlined,
  HddOutlined,
} from "@ant-design/icons";

import JumpBar from "./JumpBar";
import LoginPage from "./login/LoginPage";
import ContainersPage from "./containers/ContainersPage";
import DashboardPage from "./DashboardPage";
import ExperimentRunsPage from "./experimentRuns/ExperimentRunsPage";
import SamplesPage from "./samples/SamplesPage";
import LibrariesPage from "./libraries/LibrariesPage";
import IndividualsPage from "./individuals/IndividualsPage";
import IndicesPage from "./indices/IndicesPage";
import ProcessMeasurementsPage from "./processMeasurements/ProcessMeasurementsPage";
import ProcessesPage from "./processes/ProcessesPage";
import ProjectsPage from "./projects/ProjectsPage";
import ProfilePage from "./profile/ProfilePage";
import UsersPage from "./users/UsersPage";
import About from "./About";

import PrivateRoute from "./PrivateRoute";

import useUserInputExpiration from "../utils/useUserInputExpiration";
import {matchingMenuKeys, renderMenuItem} from "../utils/menus";
import {hour} from "../utils/time";

import {fetchInitialData, fetchSummariesData} from "../modules/shared/actions";
import {logOut} from "../modules/auth/actions";
import {get} from "../modules/users/actions";

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
    style: {marginBottom: '50px'}
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
    url: "/libraries",
    icon: <ExperimentOutlined />,
    text: "Libraries",
  },
  {
    url: "/individuals",
    icon: <TeamOutlined />,
    text: "Individuals",
  },
  {
    url: "/process-measurements",
    icon: <ExperimentOutlined />,
    text: "Protocols",
  },
  {
    url: "/experiment-runs",
    icon: <HddOutlined />,
    text: "Experiments",
  },
  {
    url: "/projects",
    icon: <ProjectOutlined />,
    text: "Projects",
  },
  {
    url: "/indices",
    icon: <BarcodeOutlined />,
    text: "Indices",
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
  usersByID: state.users.itemsByID,
});

export const actionCreators = {fetchInitialData, fetchSummariesData, logOut, get};

const App = ({userID, usersByID, logOut, fetchInitialData, fetchSummariesData, get}) => {
  useEffect(() => {
    const interval = setInterval(fetchSummariesData, 30000);
    fetchInitialData();
    return () => clearInterval(interval);
  }, []);

  const isLoggedIn = userID !== null;
  const user = usersByID[userID];

  if (!user && isLoggedIn)
    get(userID);

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
            style={{overflow: 'auto'}}
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
          <Routes>
            <Route path="/login" element={<LoginPage/>}/>
            <PrivateRoute path="/dashboard">
              <DashboardPage/>
            </PrivateRoute>
            <PrivateRoute path="/containers">
              <ContainersPage/>
            </PrivateRoute>
            <PrivateRoute path="/samples">
              <SamplesPage/>
            </PrivateRoute>
            <PrivateRoute path="/libraries">
              <LibrariesPage/>
            </PrivateRoute>
            <PrivateRoute path="/individuals">
              <IndividualsPage/>
            </PrivateRoute>
            <PrivateRoute path="/process-measurements">
              <ProcessMeasurementsPage/>
            </PrivateRoute>
            <PrivateRoute path="/processes">
              <ProcessesPage/>
            </PrivateRoute>
            <PrivateRoute path="/experiment-runs">
              <ExperimentRunsPage/>
            </PrivateRoute>
            <PrivateRoute path="/projects">
              <ProjectsPage/>
            </PrivateRoute>
            <PrivateRoute path="/indices">
              <IndicesPage/>
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
            <Navigate from="/" to="/dashboard" />
          </Routes>
        </Layout.Content>
      </Layout>
    </Layout>
  );
};

export default withRouter(connect(mapStateToProps, actionCreators)(App));

// Helpers

function onDidMount() {
  const title = document.querySelector('.App__title')
  if (title) {
    const span = title.querySelectorAll('span')[0]
    span.style.width = span.getBoundingClientRect().width + 'px'
  }
}

function withRouter(Child) {
  return (props) => {
    const location = useLocation();
    const navigate = useNavigate();
    return <Child {...props} navigate={navigate} location={location} />;
  }
}
