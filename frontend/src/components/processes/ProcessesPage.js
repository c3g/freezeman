import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import ProcessDetailContent from "./ProcessDetailContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ProcessesPage = () => <PageContainer>
  <Routes>
    <Route path="/processes/:id"><ProcessDetailContent /></Route>
    <Navigate to="/process-measurements/list" />
  </Routes>
</PageContainer>;

export default ProcessesPage;
