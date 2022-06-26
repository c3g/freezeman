import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import LibrariesListContent from "./LibrariesListContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const LibrariesPage = () => <PageContainer>
  <Routes>
    <Route path="/list" element={<LibrariesListContent />}/>
    <Route path="/actions/:action" element={<ActionContent templateType="library" />}/>
    <Navigate to="/libraries/list" />
  </Routes>
</PageContainer>;

export default LibrariesPage;