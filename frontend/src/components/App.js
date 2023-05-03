import {
  AuditOutlined, BarcodeOutlined, DashboardOutlined,
  ExperimentOutlined, FileZipOutlined, HddOutlined, InfoCircleOutlined, LogoutOutlined, ProjectOutlined, SyncOutlined, TableOutlined,
  TeamOutlined,
  UserOutlined
} from "@ant-design/icons";
import { Layout, Menu, Spin, Typography } from "antd";
import React, { useEffect } from "react";
import { connect } from "react-redux";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import About from "./About";
import ContainersPage from "./containers/ContainersPage";
import DashboardPage from "./DashboardPage";
import ExperimentRunsPage from "./experimentRuns/ExperimentRunsPage";
import IndicesPage from "./indices/IndicesPage";
import IndividualsPage from "./individuals/IndividualsPage";
import JumpBar from "./JumpBar";
import LibrariesPage from "./libraries/LibrariesPage";
import LoginPage from "./login/LoginPage";
import ProcessesPage from "./processes/ProcessesPage";
import ProcessMeasurementsPage from "./processMeasurements/ProcessMeasurementsPage";
import ProfilePage from "./profile/ProfilePage";
import ProjectsPage from "./projects/ProjectsPage";
import SamplesPage from "./samples/SamplesPage";
import UsersPage from "./users/UsersPage";

import PrivateNavigate from "./PrivateNavigate";

import { matchingMenuKeys, renderMenuItem } from "../utils/menus";
import { hour } from "../utils/time";
import useUserInputExpiration from "../utils/useUserInputExpiration";

import { useAppDispatch, useAppSelector } from "../hooks";
import { setAppInitialized } from "../modules/app/actions";
import { logOut } from "../modules/auth/actions";
import { fetchInitialData, fetchSummariesData, fetchStaticData, fetchLabworkSummary, fetchListedData } from "../modules/shared/actions";
import { get } from "../modules/users/actions";
import { selectAppInitialzed, selectAuthTokenAccess, } from "../selectors";
import DatasetsPage from "./datasets/DatasetsPage";
import LabworkPage from "./labwork/LabworkPage";


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
    style: { marginBottom: '50px' }
  },
]

const MENU_ITEMS = [
  {
    url: "/dashboard",
    icon: <DashboardOutlined />,
    text: "Dashboard",
  },
  {
    url: "/lab-work",
    icon: <ExperimentOutlined />,
    text: "Lab Work"
  },
  {
    url: "/projects",
    icon: <ProjectOutlined />,
    text: "Projects",
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
    url: "/indices",
    icon: <BarcodeOutlined />,
    text: "Indices",
  },
  {
    url: "/datasets",
    icon: <FileZipOutlined />,
    text: "Datasets",
  },
  {
    url: "/users",
    icon: <AuditOutlined />,
    text: "Users",
  },
  {
    text: "Definitions",
    children: [{
      url: "/definitions/taxons",
      text: "Taxons"
    }]
  },
]

const colorStyle = {
  color: "white",
}

const titleStyle = {
  ...colorStyle,
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

export const actionCreators = { logOut, get };

const App = ({ userID, usersByID, logOut, get }) => {

  const dispatch = useAppDispatch()
  const isInitialized = useAppSelector(selectAppInitialzed)
  const token = useAppSelector(selectAuthTokenAccess)
  useEffect(() => {


    async function loadInitialData() {
      await dispatch(fetchStaticData())
      dispatch(setAppInitialized())
      dispatch(fetchListedData())
      dispatch(fetchSummariesData())
    }

    loadInitialData()

    const interval = setInterval(() => {
      dispatch(fetchSummariesData())
      dispatch(fetchLabworkSummary())
    }, 30000);

    return () => clearInterval(interval);
  }, [token]);

  const isLoggedIn = userID !== null;
  const user = usersByID[userID];

  if (!user && isLoggedIn)
    get(userID);

  const menuItems = getMenuItems(user, logOut);

  useEffect(onDidMount, []);

  // Logout the user after 12 hours in all cases where the tab stays open
  useUserInputExpiration(logOut, 12 * hour);

  const loadingIcon = <SyncOutlined style={{ fontSize: '22px', color: 'white' }} spin />

  return (
    <Layout style={{ height: "100vh" }}>
      <Layout>
        {isLoggedIn &&
          <Layout.Sider
            collapsible
            theme="dark"
            className="App__sidebar"
            breakpoint="md"
            collapsedWidth={80}
            width={224}
            style={{ overflow: 'auto' }}
          >
            <div style={{ display: 'flex', alignContent: 'baseline', justifyContent: 'left', textAlign: 'center' }}>
              <Title style={titleStyle} className="App__title">
                <div>
                  <b>F</b><span>reeze</span><b>M</b><span>an</span>
                </div>
              </Title>
              { // Display a spinner while the initial data is being fetched at startup 
                !isInitialized &&
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Spin size="small" indicator={loadingIcon} />
                </div>
              }
            </div>
            {isLoggedIn &&
              <div className='App__jumpBar'>
                <JumpBar />
              </div>
            }

            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={matchingMenuKeys(MENU_ITEMS)}
              style={{ flex: 1 }}
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
        <Layout.Content style={{ position: "relative" }}>
          <Routes>
            <Route path="/login/*" element={<LoginPage />} />
            <Route path="/dashboard/*" element={
              <PrivateNavigate>
                <DashboardPage />
              </PrivateNavigate>
            } />
            <Route path="/containers/*" element={
              <PrivateNavigate>
                <ContainersPage />
              </PrivateNavigate>
            } />
            <Route path="/samples/*" element={
              <PrivateNavigate>
                <SamplesPage />
              </PrivateNavigate>
            } />
            <Route path="/libraries/*" element={
              <PrivateNavigate>
                <LibrariesPage />
              </PrivateNavigate>
            } />
            <Route path="/individuals/*" element={
              <PrivateNavigate>
                <IndividualsPage />
              </PrivateNavigate>
            } />
            <Route path="/process-measurements/*" element={
              <PrivateNavigate>
                <ProcessMeasurementsPage />
              </PrivateNavigate>
            } />
            <Route path="/processes/*" element={
              <PrivateNavigate>
                <ProcessesPage />
              </PrivateNavigate>
            } />
            <Route path="/experiment-runs/*" element={
              <PrivateNavigate>
                <ExperimentRunsPage />
              </PrivateNavigate>
            } />
            <Route path="/projects/*" element={
              <PrivateNavigate>
                <ProjectsPage />
              </PrivateNavigate>
            } />
            <Route path="/lab-work/*" element={
              <PrivateNavigate>
                <LabworkPage />
              </PrivateNavigate>
            } />
            <Route path="/indices/*" element={
              <PrivateNavigate>
                <IndicesPage />
              </PrivateNavigate>
            } />
            <Route path="/users/*" element={
              <PrivateNavigate>
                <UsersPage />
              </PrivateNavigate>
            } />
            <Route path="/profile/*" element={
              <PrivateNavigate>
                <ProfilePage />
              </PrivateNavigate>
            } />
            <Route path="/about/*" element={
              <PrivateNavigate>
                <About />
              </PrivateNavigate>
            } />
            <Route path="/datasets/*" element={
              <PrivateNavigate>
                <DatasetsPage />
              </PrivateNavigate>
            } />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
