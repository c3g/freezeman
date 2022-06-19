import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import LibrariesListContent from "./LibrariesListContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const LibrariesPage = () => <PageContainer>
  <Routes>
    <Route path="/libraries/list"><LibrariesListContent /></Route>
    <Route path="/libraries/actions/:action"><ActionContent templateType="library" /></Route>
    <Navigate to="/libraries/list" />
  </Routes>
</PageContainer>;

export default LibrariesPage;